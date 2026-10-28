import { connectDB } from "@/lib/db";
import { Comment, Notification, Post } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertObjectId, assertSameOrigin, ApiError } from "@/lib/http";
import { commentSchema } from "@/lib/schemas";

type Context = { params: Promise<{ id: string }> };
export const PATCH = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await context.params;
  assertObjectId(id, "Comment");
  await connectDB();
  const comment = await Comment.findById(id);
  if (!comment) throw new ApiError(404, "This comment could not be found.");
  if (String(comment.authorId) !== String(user._id) && user.role !== "admin") throw new ApiError(403, "You can only edit your own comment.");
  const { content } = await readBody(req, commentSchema);
  comment.content = content;
  await comment.save();
  return json({ comment: await Comment.findById(id).populate("authorId", "name username profileImage").lean() });
})(request);

export const DELETE = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { id } = await context.params;
  assertObjectId(id, "Comment");
  await connectDB();
  const comment = await Comment.findById(id);
  if (!comment) throw new ApiError(404, "This comment could not be found.");
  const post = await Post.findById(comment.postId).select("authorId");
  if (String(comment.authorId) !== String(user._id) && String(post?.authorId) !== String(user._id) && user.role !== "admin") throw new ApiError(403, "You don’t have permission to remove this comment.");
  await Comment.deleteOne({ _id: id });
  if (post) await Post.updateOne({ _id: comment.postId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  await Notification.deleteMany({ commentId: id });
  return json({ message: "Comment deleted." });
})(request);
