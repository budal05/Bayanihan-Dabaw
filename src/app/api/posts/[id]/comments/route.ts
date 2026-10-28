import { connectDB } from "@/lib/db";
import { Comment, Notification, Post } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertObjectId, assertSameOrigin, ApiError } from "@/lib/http";
import { commentSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };
export const GET = async (request: Request, context: Context) => api(async () => {
  await connectDB();
  const { id } = await context.params;
  assertObjectId(id, "Post");
  if (!await Post.exists({ _id: id, visibility: "public" })) throw new ApiError(404, "This community post could not be found.");
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const filter: Record<string, unknown> = { postId: id };
  if (cursor) { assertObjectId(cursor, "Comment"); const comment = await Comment.findById(cursor).select("createdAt").lean(); if (comment) filter.$or = [{ createdAt: { $lt: comment.createdAt } }, { createdAt: comment.createdAt, _id: { $lt: comment._id } }]; }
  const rows = await Comment.find(filter).sort({ createdAt: -1, _id: -1 }).limit(31).populate("authorId", "name username profileImage").lean();
  const hasMore = rows.length > 30;
  const items = hasMore ? rows.slice(0, 30) : rows;
  return json({ items, nextCursor: hasMore ? String(items.at(-1)?._id) : null });
})(request);

export const POST = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await rateLimit(req, "comment", 60, 60 * 60 * 1000);
  const { id } = await context.params;
  assertObjectId(id, "Post");
  const { content } = await readBody(req, commentSchema);
  await connectDB();
  const post = await Post.findOne({ _id: id, visibility: "public" }).select("authorId");
  if (!post) throw new ApiError(404, "This community post could not be found.");
  const comment = await Comment.create({ postId: id, authorId: user._id, content });
  await Post.updateOne({ _id: id }, { $inc: { commentCount: 1 } });
  if (String(post.authorId) !== String(user._id)) await Notification.create({ recipientId: post.authorId, actorId: user._id, type: "comment", postId: id, commentId: comment._id });
  const populated = await Comment.findById(comment._id).populate("authorId", "name username profileImage").lean();
  return json({ comment: populated }, 201);
})(request);
