import { connectDB } from "@/lib/db";
import { Comment, Post, Report, User } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";
import { api, json, ApiError } from "@/lib/http";

export const GET = api(async (request) => {
  await requireAdmin();
  await connectDB();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";
  if (!(["pending", "reviewed", "resolved", "dismissed", "all"] as const).includes(status as "pending" | "reviewed" | "resolved" | "dismissed" | "all")) throw new ApiError(400, "That moderation filter is not valid.");
  const filter: { status?: "pending" | "reviewed" | "resolved" | "dismissed" } = status === "all" ? {} : { status: status as "pending" | "reviewed" | "resolved" | "dismissed" };
  const reports = await Report.find(filter).sort({ createdAt: 1 }).limit(100).populate("reporterId", "name username profileImage").populate("reviewedBy", "name username").lean();
  const postIds = reports.filter((report) => report.targetType === "post").map((report) => report.targetId);
  const commentIds = reports.filter((report) => report.targetType === "comment").map((report) => report.targetId);
  const userIds = reports.filter((report) => report.targetType === "user").map((report) => report.targetId);
  const [posts, comments, users] = await Promise.all([
    Post.find({ _id: { $in: postIds } }).select("title caption").lean(),
    Comment.find({ _id: { $in: commentIds } }).select("content postId").lean(),
    User.find({ _id: { $in: userIds } }).select("name username").lean(),
  ]);
  const postMap = new Map(posts.map((post) => [String(post._id), post]));
  const commentMap = new Map(comments.map((comment) => [String(comment._id), comment]));
  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const items = reports.map((report) => {
    const targetId = String(report.targetId);
    if (report.targetType === "post") { const target = postMap.get(targetId); return { ...report, target: target ? { label: target.title || target.caption.slice(0, 180), href: `/post/${targetId}` } : null }; }
    if (report.targetType === "comment") { const target = commentMap.get(targetId); return { ...report, target: target ? { label: target.content, href: `/post/${target.postId}` } : null }; }
    const target = userMap.get(targetId);
    return { ...report, target: target ? { label: `${target.name} (@${target.username})`, href: `/u/${target.username}` } : null };
  });
  return json({ items });
});
