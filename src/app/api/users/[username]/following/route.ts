import { connectDB } from "@/lib/db";
import { Follow, User } from "@/lib/models";
import { api, json, ApiError } from "@/lib/http";
import { optionalUser } from "@/lib/auth";

type Context = { params: Promise<{ username: string }> };
export const GET = async (request: Request, context: Context) => api(async () => {
  await connectDB();
  const { username } = await context.params;
  const user = await User.findOne({ username: username.toLowerCase(), status: "active" }).select("_id");
  if (!user) throw new ApiError(404, "We couldn’t find that community member.");
  const rows = await Follow.find({ followerId: user._id }).sort({ createdAt: -1 }).limit(100).populate("followingId", "name username profileImage").lean();
  const current = await optionalUser();
  const ids = rows.map((row) => String((row.followingId as unknown as { _id: unknown })._id));
  const currentFollows = current ? await Follow.find({ followerId: current._id, followingId: { $in: ids } }).select("followingId").lean() : [];
  const followed = new Set(currentFollows.map((row) => String(row.followingId)));
  return json({ items: rows.map((row) => { const following = row.followingId as unknown as { _id: unknown; name: string; username: string; profileImage?: { url: string } | null }; return { ...following, isFollowing: followed.has(String(following._id)) }; }) });
})(request);
