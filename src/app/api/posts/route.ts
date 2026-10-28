import { connectDB } from "@/lib/db";
import { Follow, Like, Post, SavedPost } from "@/lib/models";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { postSchema } from "@/lib/schemas";
import { optionalUser, requireUser } from "@/lib/auth";
import { validateOwnedImages, validateOwnedImage } from "@/lib/media";
import { decodeCursor, encodeCursor, encodePopularityCursor } from "@/lib/pagination";
import { POST_CATEGORIES, REQUEST_TYPES, MAX_IMAGES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const GET = api(async (request) => {
  await connectDB();
  const current = await optionalUser();
  const url = new URL(request.url);
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  const query: Record<string, unknown> = { visibility: "public" };
  const userId = url.searchParams.get("userId");
  if (userId) { if (!/^[a-f\d]{24}$/i.test(userId)) throw new ApiError(400, "That profile could not be found."); query.authorId = userId; }
  if (url.searchParams.get("category") && POST_CATEGORIES.includes(url.searchParams.get("category") as typeof POST_CATEGORIES[number])) query.category = url.searchParams.get("category");
  if (url.searchParams.get("type") && REQUEST_TYPES.includes(url.searchParams.get("type") as typeof REQUEST_TYPES[number])) query.requestType = url.searchParams.get("type");
  const location = url.searchParams.get("location")?.trim().slice(0, 60);
  if (location) query.location = { $regex: location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const search = url.searchParams.get("q")?.trim().slice(0, 80);
  if (search) query.$text = { $search: search };
  if (url.searchParams.get("following") === "1") {
    if (!current) throw new ApiError(401, "Please sign in to view your Following feed.");
    const follows = await Follow.find({ followerId: current._id }).select("followingId").lean();
    query.authorId = { $in: follows.map((f) => f.followingId) };
  }
  const popular = url.searchParams.get("sort") === "popular";
  if (cursor && popular && cursor.likes !== undefined && cursor.comments !== undefined) query.$or = [
    { likeCount: { $lt: cursor.likes } },
    { likeCount: cursor.likes, commentCount: { $lt: cursor.comments } },
    { likeCount: cursor.likes, commentCount: cursor.comments, createdAt: { $lt: cursor.createdAt } },
    { likeCount: cursor.likes, commentCount: cursor.comments, createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
  ];
  else if (cursor) query.$or = [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor.id } }];
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 12, 1), 30);
  const posts = await Post.find(query).sort(popular ? { likeCount: -1, commentCount: -1, createdAt: -1, _id: -1 } : { createdAt: -1, _id: -1 }).limit(limit + 1).populate("authorId", "name username profileImage role").lean();
  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  const ids = page.map((p) => p._id);
  const [likes, saves] = current ? await Promise.all([Like.find({ userId: current._id, postId: { $in: ids } }).select("postId").lean(), SavedPost.find({ userId: current._id, postId: { $in: ids } }).select("postId").lean()]) : [[], []];
  const liked = new Set(likes.map((i) => String(i.postId)));
  const saved = new Set(saves.map((i) => String(i.postId)));
  const items = page.map((post) => ({ ...post, isLiked: liked.has(String(post._id)), isSaved: saved.has(String(post._id)) }));
  const last = page.at(-1);
  return json({ items, nextCursor: hasMore && last ? popular ? encodePopularityCursor(last.likeCount, last.commentCount, last.createdAt!, last._id) : encodeCursor(last.createdAt!, last._id) : null });
});

export const POST = api(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await rateLimit(request, "create-post", 20, 60 * 60 * 1000);
  const input = await readBody(request, postSchema);
  if (input.images.length > MAX_IMAGES) throw new ApiError(400, `Add no more than ${MAX_IMAGES} photos.`);
  validateOwnedImages(input.images, String(user._id));
  if (input.donation.enabled && input.donation.qrImage) validateOwnedImage(input.donation.qrImage, String(user._id));
  const post = await Post.create({ ...input, authorId: user._id, visibility: "public" });
  const populated = await Post.findById(post._id).populate("authorId", "name username profileImage role").lean();
  return json({ post: { ...populated, isLiked: false, isSaved: false } }, 201);
});
