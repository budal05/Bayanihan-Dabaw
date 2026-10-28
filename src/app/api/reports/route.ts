import { connectDB } from "@/lib/db";
import { Comment, Post, Report, User } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { reportSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";

export const POST = api(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await rateLimit(request, "report", 20, 60 * 60 * 1000);
  const input = await readBody(request, reportSchema);
  await connectDB();
  const exists = input.targetType === "post" ? await Post.exists({ _id: input.targetId }) : input.targetType === "comment" ? await Comment.exists({ _id: input.targetId }) : await User.exists({ _id: input.targetId });
  if (!exists) throw new ApiError(404, "That content could not be found.");
  const existing = await Report.findOne({ reporterId: user._id, targetType: input.targetType, targetId: input.targetId, status: "pending" });
  if (existing) return json({ message: "Thanks, this content is already in the moderation queue." });
  await Report.create({ ...input, reporterId: user._id });
  return json({ message: "Thanks for helping keep Bayanihan Dabaw safe. Our moderation team will review this report." }, 201);
});
