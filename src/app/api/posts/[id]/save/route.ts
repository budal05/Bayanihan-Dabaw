import { connectDB } from "@/lib/db";
import { Post, SavedPost } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertObjectId, assertSameOrigin, ApiError } from "@/lib/http";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ active: z.boolean() });
type Context = { params: Promise<{ id: string }> };
export const POST = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await rateLimit(req, "save", 300, 60 * 60 * 1000);
  const { id } = await context.params;
  assertObjectId(id, "Post");
  await connectDB();
  if (!await Post.exists({ _id: id, visibility: "public" })) throw new ApiError(404, "This community post could not be found.");
  const { active } = await readBody(req, schema);
  if (active) {
    try { await SavedPost.create({ userId: user._id, postId: id }); }
    catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error; }
  }
  else await SavedPost.deleteOne({ userId: user._id, postId: id });
  return json({ active });
})(request);
