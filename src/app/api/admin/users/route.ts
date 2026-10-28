import { connectDB } from "@/lib/db";
import { Follow, ModerationLog, Post, Report, User } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { z } from "zod";

export const GET = api(async (request) => {
  await requireAdmin();
  await connectDB();
  const [users, posts, pendingReports, follows] = await Promise.all([User.countDocuments(), Post.countDocuments(), Report.countDocuments({ status: "pending" }), Follow.countDocuments()]);
  const search = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60);
  const filter = search ? { $or: [{ username: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }, { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }] } : {};
  const items = await User.find(filter).select("name username email role status emailVerifiedAt createdAt").sort({ createdAt: -1 }).limit(100).lean();
  return json({ stats: { users, posts, pendingReports, follows }, items });
});

const schema = z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i), action: z.enum(["suspend", "restore"]), reason: z.string().trim().max(500).default("") });
export const PATCH = api(async (request) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await readBody(request, schema);
  await connectDB();
  const user = await User.findById(input.userId).select("role status");
  if (!user) throw new ApiError(404, "That account could not be found.");
  if (user.role === "admin" || String(user._id) === String(admin._id)) throw new ApiError(403, "Administrator accounts cannot be changed from this screen.");
  user.status = input.action === "suspend" ? "suspended" : "active";
  await user.save();
  await Post.updateMany({ authorId: user._id }, { $set: { visibility: input.action === "suspend" ? "hidden" : "public" } });
  if (input.action === "suspend") await (await import("@/lib/models")).Session.deleteMany({ userId: user._id });
  await ModerationLog.create({ adminId: admin._id, action: input.action, targetType: "user", targetId: user._id, reason: input.reason });
  return json({ message: `Account ${input.action === "suspend" ? "suspended" : "restored"}.` });
});
