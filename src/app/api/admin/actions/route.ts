import { connectDB } from "@/lib/db";
import { Comment, Like, ModerationLog, Notification, Post, Report, SavedPost, Session, User } from "@/lib/models";
import { requireAdmin } from "@/lib/auth";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { moderationSchema } from "@/lib/schemas";

export const POST = api(async (request) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await readBody(request, moderationSchema);
  await connectDB();
  const { targetId, targetType, action, reason, reportId } = input;
  if (targetType === "report" || action === "resolve" || action === "dismiss") {
    const id = reportId ?? targetId;
    const report = await Report.findById(id);
    if (!report) throw new ApiError(404, "That moderation report could not be found.");
    report.status = action === "dismiss" ? "dismissed" : action === "resolve" ? "resolved" : "reviewed";
    report.reviewedBy = admin._id;
    report.reviewedAt = new Date();
    await report.save();
    await ModerationLog.create({ adminId: admin._id, action, targetType: "report", targetId: report._id, reason });
    return json({ message: `Report marked ${report.status}.` });
  }
  if (targetType === "post") {
    if (action !== "remove") throw new ApiError(400, "That action is not available for posts.");
    const post = await Post.findById(targetId);
    if (!post) throw new ApiError(404, "That post could not be found.");
    await Promise.all([Post.deleteOne({ _id: targetId }), Like.deleteMany({ postId: targetId }), SavedPost.deleteMany({ postId: targetId }), Comment.deleteMany({ postId: targetId }), Notification.deleteMany({ postId: targetId })]);
  } else if (targetType === "comment") {
    if (action !== "remove") throw new ApiError(400, "That action is not available for comments.");
    const comment = await Comment.findByIdAndDelete(targetId);
    if (!comment) throw new ApiError(404, "That comment could not be found.");
    await Post.updateOne({ _id: comment.postId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
    await Notification.deleteMany({ commentId: comment._id });
  } else {
    if (!["suspend", "restore"].includes(action)) throw new ApiError(400, "That action is not available for accounts.");
    const person = await User.findById(targetId).select("role status");
    if (!person) throw new ApiError(404, "That account could not be found.");
    if (String(person._id) === String(admin._id) || person.role === "admin") throw new ApiError(403, "Administrator accounts cannot be changed from this screen.");
    person.status = action === "suspend" ? "suspended" : "active";
    await person.save();
    await Post.updateMany({ authorId: person._id }, { $set: { visibility: action === "suspend" ? "hidden" : "public" } });
    if (action === "suspend") await Session.deleteMany({ userId: person._id });
  }
  if (reportId) await Report.updateOne({ _id: reportId }, { $set: { status: "resolved", reviewedBy: admin._id, reviewedAt: new Date() } });
  await ModerationLog.create({ adminId: admin._id, action, targetType, targetId, reason });
  return json({ message: "Moderation action recorded." });
});
