import { connectDB } from "@/lib/db";
import { Follow, Notification, User } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ active: z.boolean() });
type Context = { params: Promise<{ username: string }> };
export const POST = async (request: Request, context: Context) => api(async (req) => {
  assertSameOrigin(req);
  const current = await requireUser();
  await rateLimit(req, "follow", 150, 60 * 60 * 1000);
  const { username: id } = await context.params;
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(404, "Account not found.");
  if (String(current._id) === id) throw new ApiError(400, "You can’t follow your own account.");
  const { active } = await readBody(req, schema);
  await connectDB();
  const target = await User.findOne({ _id: id, status: "active" }).select("_id");
  if (!target) throw new ApiError(404, "That community member could not be found.");
  if (active) {
    try {
      await Follow.create({ followerId: current._id, followingId: target._id });
      await Notification.create({ recipientId: target._id, actorId: current._id, type: "follow" });
    } catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error; }
  } else await Follow.deleteOne({ followerId: current._id, followingId: target._id });
  const [followers, following] = await Promise.all([Follow.countDocuments({ followingId: target._id }), Follow.countDocuments({ followerId: target._id })]);
  return json({ active, counts: { followers, following } });
})(request);
