import { connectDB } from "@/lib/db";
import { User, Follow } from "@/lib/models";
import { api, json } from "@/lib/http";
import { optionalUser } from "@/lib/auth";

export const GET = api(async (request) => {
  await connectDB();
  const url = new URL(request.url);
  const queryText = url.searchParams.get("q")?.trim().slice(0, 50) ?? "";
  if (!queryText) return json({ items: [] });
  const safe = queryText.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const current = await optionalUser();
  const users = await User.find({ status: "active", $or: [{ username: { $regex: `^${safe}` } }, { nameSearch: { $regex: `^${safe}` } }] }).select("name username profileImage bio").limit(12).lean();
  const ids = users.map((user) => user._id);
  const follows = current ? await Follow.find({ followerId: current._id, followingId: { $in: ids } }).select("followingId").lean() : [];
  const following = new Set(follows.map((f) => String(f.followingId)));
  return json({ items: users.map((user) => ({ ...user, isFollowing: following.has(String(user._id)) })) });
});
