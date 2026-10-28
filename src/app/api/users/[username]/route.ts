import { connectDB } from "@/lib/db";
import { Follow, Post, User } from "@/lib/models";
import { api, json, ApiError } from "@/lib/http";
import { optionalUser } from "@/lib/auth";

type Context = { params: Promise<{ username: string }> };
export const GET = async (request: Request, context: Context) => api(async () => {
  await connectDB();
  const { username } = await context.params;
  const user = await User.findOne({ username: username.toLowerCase(), status: "active" }).select("name username profileImage bio createdAt").lean();
  if (!user) throw new ApiError(404, "We couldn’t find that community member.");
  const current = await optionalUser();
  const [followers, following, posts, relationship] = await Promise.all([
    Follow.countDocuments({ followingId: user._id }), Follow.countDocuments({ followerId: user._id }), Post.countDocuments({ authorId: user._id, visibility: "public" }),
    current && String(current._id) !== String(user._id) ? Follow.exists({ followerId: current._id, followingId: user._id }) : Promise.resolve(null),
  ]);
  return json({ user: { ...user, isFollowing: Boolean(relationship), isSelf: Boolean(current && String(current._id) === String(user._id)) }, counts: { posts, followers, following } });
})(request);
