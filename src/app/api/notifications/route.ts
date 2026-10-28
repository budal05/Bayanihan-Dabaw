import { connectDB } from "@/lib/db";
import { Notification } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json, readBody, assertSameOrigin, ApiError, assertObjectId } from "@/lib/http";
import { z } from "zod";

export const GET = api(async () => {
  const user = await requireUser();
  await connectDB();
  const [items, unreadCount] = await Promise.all([
    Notification.find({ recipientId: user._id }).sort({ createdAt: -1 }).limit(50).populate("actorId", "name username profileImage").populate("postId", "title caption").lean(),
    Notification.countDocuments({ recipientId: user._id, readAt: null }),
  ]);
  return json({ items, unreadCount });
});

const schema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i).optional(), all: z.boolean().optional() }).refine((data) => data.id || data.all);
export const POST = api(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const input = await readBody(request, schema);
  await connectDB();
  if (input.all) await Notification.updateMany({ recipientId: user._id, readAt: null }, { $set: { readAt: new Date() } });
  else {
    assertObjectId(input.id!, "Notification");
    const result = await Notification.updateOne({ _id: input.id, recipientId: user._id }, { $set: { readAt: new Date() } });
    if (!result.matchedCount) throw new ApiError(404, "That notification could not be found.");
  }
  return json({ message: "Notifications updated." });
});
