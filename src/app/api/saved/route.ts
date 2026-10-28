import { connectDB } from "@/lib/db";
import { Post, SavedPost } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { api, json } from "@/lib/http";

export const GET = api(async () => {
  const user = await requireUser();
  await connectDB();
  const rows = await SavedPost.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100).select("postId createdAt").lean();
  const posts = await Post.find({ _id: { $in: rows.map((row) => row.postId) }, visibility: "public" }).populate("authorId", "name username profileImage role").lean();
  const order = new Map(rows.map((row, index) => [String(row.postId), index]));
  posts.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
  return json({ items: posts.map((post) => ({ ...post, isLiked: false, isSaved: true })) });
});
