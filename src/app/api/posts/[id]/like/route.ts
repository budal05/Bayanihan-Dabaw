import { connectDB } from "@/lib/db";
import { Like, Notification, Post } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertObjectId, assertSameOrigin, ApiError } from "@/lib/http";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ active: z.boolean() });
type Context = { params: Promise<{ id: string }> };
export const POST = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await rateLimit(req, "like", 300, 60 * 60 * 1000);
  const { id } = await context.params;
  assertObjectId(id, "Post");
  const { active } = await readBody(req, schema);
  await connectDB();
  const post = await Post.findOne({ _id: id, visibility: "public" }).select("authorId likeCount");
  if (!post) throw new ApiError(404, "This community post could not be found.");
  if (active) {
    let created = false;
    try { await Like.create({ userId: user._id, postId: id }); created = true; }
    catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error; }
    if (created) {
      await Post.updateOne({ _id: id }, { $inc: { likeCount: 1 } });
      if (String(post.authorId) !== String(user._id)) await Notification.create({ recipientId: post.authorId, actorId: user._id, type: "like", postId: id });
    }
  } else {
    const deleted = await Like.findOneAndDelete({ userId: user._id, postId: id });
    if (deleted) await Post.updateOne({ _id: id }, { $inc: { likeCount: -1 } });
  }
  const updated = await Post.findById(id).select("likeCount").lean();
  return json({ active, likeCount: Math.max(0, updated?.likeCount ?? 0) });
})(request);
