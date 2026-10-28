import { connectDB } from "@/lib/db";
import { Comment, Like, Notification, Post, SavedPost } from "@/lib/models";
import { api, json, readBody, assertObjectId, assertSameOrigin, ApiError } from "@/lib/http";
import { postSchema } from "@/lib/schemas";
import { optionalUser, requireUser } from "@/lib/auth";
import { validateOwnedImages, validateOwnedImage } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };

export const GET = async (request: Request, context: Context) => api(async () => {
  await connectDB();
  const { id } = await context.params;
  assertObjectId(id, "Post");
  const post = await Post.findOne({ _id: id, visibility: "public" }).populate("authorId", "name username profileImage role").lean();
  if (!post) throw new ApiError(404, "This community post could not be found.");
  const current = await optionalUser();
  const [liked, saved] = current ? await Promise.all([Like.exists({ userId: current._id, postId: id }), SavedPost.exists({ userId: current._id, postId: id })]) : [null, null];
  return json({ post: { ...post, isLiked: Boolean(liked), isSaved: Boolean(saved) } });
})(request);

export const PATCH = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await rateLimit(req, "edit-post", 60, 60 * 60 * 1000);
  const { id } = await context.params;
  assertObjectId(id, "Post");
  const post = await Post.findById(id);
  if (!post) throw new ApiError(404, "This community post could not be found.");
  if (String(post.authorId) !== String(user._id) && user.role !== "admin") throw new ApiError(403, "You can only edit your own community post.");
  const input = await readBody(req, postSchema);
  validateOwnedImages(input.images, String(post.authorId));
  if (input.donation.enabled && input.donation.qrImage) validateOwnedImage(input.donation.qrImage, String(post.authorId));
  Object.assign(post, input);
  await post.save();
  const updated = await Post.findById(id).populate("authorId", "name username profileImage role").lean();
  return json({ post: updated });
})(request);

export const DELETE = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await context.params;
  assertObjectId(id, "Post");
  const post = await Post.findById(id).select("authorId");
  if (!post) throw new ApiError(404, "This community post could not be found.");
  if (String(post.authorId) !== String(user._id) && user.role !== "admin") throw new ApiError(403, "You can only delete your own community post.");
  await Promise.all([Post.deleteOne({ _id: id }), Like.deleteMany({ postId: id }), SavedPost.deleteMany({ postId: id }), Comment.deleteMany({ postId: id }), Notification.deleteMany({ postId: id })]);
  return json({ message: "Community post deleted." });
})(request);
