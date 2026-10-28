import mongoose, { Schema, Types, type Model } from "mongoose";
import { POST_CATEGORIES, REQUEST_TYPES, REPORT_REASONS } from "@/lib/constants";

export type ImageRecord = { url: string; publicId: string; width?: number; height?: number };
export type DonationRecord = { enabled: boolean; provider?: "GCash" | "Maya" | "Bank QR" | "Other"; displayName?: string; qrImage?: ImageRecord; purpose?: string; requestedAmount?: number; contact?: string };
export interface UserRecord {
  name: string; nameSearch: string; username: string; email: string; passwordHash: string; emailVerifiedAt: Date | null; termsAcceptedAt: Date | null;
  profileImage: ImageRecord | null; bio: string; role: "user" | "admin"; status: "active" | "suspended"; donationWallet?: DonationRecord;
  createdAt?: Date; updatedAt?: Date;
}
export interface PostRecord {
  authorId: Types.ObjectId; title: string; caption: string; images: ImageRecord[];
  category: typeof POST_CATEGORIES[number]; requestType: typeof REQUEST_TYPES[number]; location: string;
  donation: DonationRecord; visibility: "public" | "hidden"; likeCount: number; commentCount: number; createdAt?: Date; updatedAt?: Date;
}
export interface LikeRecord { userId: Types.ObjectId; postId: Types.ObjectId; createdAt?: Date }
export interface CommentRecord { authorId: Types.ObjectId; postId: Types.ObjectId; content: string; parentCommentId: Types.ObjectId | null; createdAt?: Date; updatedAt?: Date }
export interface FollowRecord { followerId: Types.ObjectId; followingId: Types.ObjectId; createdAt?: Date }
export interface SavedPostRecord { userId: Types.ObjectId; postId: Types.ObjectId; createdAt?: Date }
export interface NotificationRecord { recipientId: Types.ObjectId; actorId: Types.ObjectId; type: "follow" | "like" | "comment"; postId?: Types.ObjectId; commentId?: Types.ObjectId; readAt: Date | null; createdAt?: Date }
export interface ReportRecord { reporterId: Types.ObjectId; targetType: "post" | "comment" | "user"; targetId: Types.ObjectId; reason: typeof REPORT_REASONS[number]; details: string; status: "pending" | "reviewed" | "resolved" | "dismissed"; reviewedBy?: Types.ObjectId; reviewedAt?: Date; createdAt?: Date }
export interface SessionRecord { userId: Types.ObjectId; tokenHash: string; expiresAt: Date; createdAt?: Date; updatedAt?: Date }
export interface EmailTokenRecord { userId: Types.ObjectId; tokenHash: string; type: "verify" | "reset"; expiresAt: Date; usedAt: Date | null; createdAt?: Date; updatedAt?: Date }
export interface ThrottleRecord { key: string; count: number; expiresAt: Date; createdAt?: Date; updatedAt?: Date }
export interface ModerationLogRecord { adminId: Types.ObjectId; action: string; targetType: "post" | "comment" | "user" | "report"; targetId: Types.ObjectId; reason: string; createdAt?: Date }

const imageSchema: Schema = new Schema({ url: { type: String, required: true, maxlength: 1200 }, publicId: { type: String, required: true, maxlength: 250 }, width: Number, height: Number }, { _id: false });
const donationSchema: Schema = new Schema({ enabled: { type: Boolean, default: false }, provider: { type: String, enum: ["GCash", "Maya", "Bank QR", "Other"] }, displayName: { type: String, maxlength: 80 }, qrImage: imageSchema, purpose: { type: String, maxlength: 180 }, requestedAmount: { type: Number, min: 1, max: 10000000 }, contact: { type: String, maxlength: 120 } }, { _id: false });

const userSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  nameSearch: { type: String, default: "", lowercase: true, select: false },
  username: { type: String, required: true, lowercase: true, trim: true, minlength: 3, maxlength: 24, match: /^[a-z0-9_]+$/ },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  emailVerifiedAt: { type: Date, default: null },
  termsAcceptedAt: { type: Date, default: null },
  profileImage: { type: imageSchema, default: null },
  bio: { type: String, default: "", maxlength: 240 },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  donationWallet: { type: donationSchema, default: undefined },
}, { timestamps: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ nameSearch: 1 });
userSchema.index({ name: "text", username: "text" });

const postSchema: Schema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, trim: true, maxlength: 120, default: "" },
  caption: { type: String, required: true, trim: true, minlength: 1, maxlength: 3000 },
  images: { type: [imageSchema], default: [], validate: [(a: unknown[]) => a.length <= 5, "A post can contain up to five photos"] },
  category: { type: String, enum: POST_CATEGORIES, required: true },
  requestType: { type: String, enum: REQUEST_TYPES, required: true },
  location: { type: String, trim: true, maxlength: 100, default: "" },
  donation: { type: donationSchema, default: () => ({ enabled: false }) },
  visibility: { type: String, enum: ["public", "hidden"], default: "public" },
  likeCount: { type: Number, default: 0, min: 0 },
  commentCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ requestType: 1, location: 1, createdAt: -1 });
postSchema.index({ location: 1, createdAt: -1 });
postSchema.index({ likeCount: -1, commentCount: -1, createdAt: -1, _id: -1 });
postSchema.index({ caption: "text", title: "text" });

const likeSchema: Schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, postId: { type: Schema.Types.ObjectId, ref: "Post", required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });
likeSchema.index({ postId: 1, createdAt: -1 });

const commentSchema: Schema = new Schema({ authorId: { type: Schema.Types.ObjectId, ref: "User", required: true }, postId: { type: Schema.Types.ObjectId, ref: "Post", required: true }, content: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 }, parentCommentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null } }, { timestamps: true });
commentSchema.index({ postId: 1, createdAt: 1, _id: 1 });

const followSchema: Schema = new Schema({ followerId: { type: Schema.Types.ObjectId, ref: "User", required: true }, followingId: { type: Schema.Types.ObjectId, ref: "User", required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1, createdAt: -1 });
followSchema.index({ followerId: 1, createdAt: -1 });

const savedPostSchema: Schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, postId: { type: Schema.Types.ObjectId, ref: "Post", required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
savedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

const notificationSchema: Schema = new Schema({ recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true }, actorId: { type: Schema.Types.ObjectId, ref: "User", required: true }, type: { type: String, enum: ["follow", "like", "comment"], required: true }, postId: { type: Schema.Types.ObjectId, ref: "Post" }, commentId: { type: Schema.Types.ObjectId, ref: "Comment" }, readAt: { type: Date, default: null } }, { timestamps: { createdAt: true, updatedAt: false } });
notificationSchema.index({ recipientId:  1, createdAt: -1 });

const reportSchema: Schema = new Schema({ reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true }, targetType: { type: String, enum: ["post", "comment", "user"], required: true }, targetId: { type: Schema.Types.ObjectId, required: true }, reason: { type: String, enum: REPORT_REASONS, required: true }, details: { type: String, maxlength: 1000, default: "" }, status: { type: String, enum: ["pending", "reviewed", "resolved", "dismissed"], default: "pending" }, reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }, reviewedAt: Date }, { timestamps: { createdAt: true, updatedAt: false } });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

const sessionSchema: Schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, tokenHash: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true } }, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const emailTokenSchema: Schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, tokenHash: { type: String, required: true, unique: true }, type: { type: String, enum: ["verify", "reset"], required: true }, expiresAt: { type: Date, required: true }, usedAt: { type: Date, default: null } }, { timestamps: true });
emailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const throttleSchema: Schema = new Schema({ key: { type: String, unique: true, required: true }, count: { type: Number, default: 0 }, expiresAt: { type: Date, required: true } }, { timestamps: true });
throttleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const moderationLogSchema: Schema = new Schema({ adminId: { type: Schema.Types.ObjectId, ref: "User", required: true }, action: { type: String, required: true, maxlength: 80 }, targetType: { type: String, enum: ["post", "comment", "user", "report"], required: true }, targetId: { type: Schema.Types.ObjectId, required: true }, reason: { type: String, maxlength: 500, default: "" } }, { timestamps: { createdAt: true, updatedAt: false } });

function modelFor<T extends object>(name: string, schema: Schema): Model<T> { return (mongoose.models[name] ?? mongoose.model(name, schema)) as Model<T>; }

export const User = modelFor<UserRecord>("User", userSchema);
export const Post = modelFor<PostRecord>("Post", postSchema);
export const Like = modelFor<LikeRecord>("Like", likeSchema);
export const Comment = modelFor<CommentRecord>("Comment", commentSchema);
export const Follow = modelFor<FollowRecord>("Follow", followSchema);
export const SavedPost = modelFor<SavedPostRecord>("SavedPost", savedPostSchema);
export const Notification = modelFor<NotificationRecord>("Notification", notificationSchema);
export const Report = modelFor<ReportRecord>("Report", reportSchema);
export const Session = modelFor<SessionRecord>("Session", sessionSchema);
export const EmailToken = modelFor<EmailTokenRecord>("EmailToken", emailTokenSchema);
export const Throttle = modelFor<ThrottleRecord>("Throttle", throttleSchema);
export const ModerationLog = modelFor<ModerationLogRecord>("ModerationLog", moderationLogSchema);

export type PublicUser = { _id: unknown; name: string; username: string; profileImage?: { url: string } | null; bio?: string; role?: string };
