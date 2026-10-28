import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Comment, EmailToken, Follow, Like, Post, SavedPost, Session, User } from "@/lib/models";
import { hashToken } from "@/lib/auth";
import { commentSchema, loginSchema, postSchema, registerSchema, reportSchema, resetSchema } from "@/lib/schemas";
import { decodeCursor, encodeCursor } from "@/lib/pagination";
import { validateOwnedImage } from "@/lib/media";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "node:crypto";
import { Throttle } from "@/lib/models";

let mongo: MongoMemoryServer;
const oldUri = process.env.MONGODB_URI;
const alice = { name: "Ari Community", username: "ari_davao", email: "ari@example.com", passwordHash: "hashed-placeholder" };
const bob = { name: "Bela Neighbor", username: "bela_neighbor", email: "bela@example.com", passwordHash: "hashed-placeholder" };

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri("bayanihan-test");
  await connectDB();
  await Promise.all([User.init(), Post.init(), Like.init(), Follow.init(), SavedPost.init(), EmailToken.init(), Session.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
  if (oldUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = oldUri;
});

describe("account validation and persistence", () => {
  it("accepts a strong registration and rejects weak credentials and duplicate accounts", async () => {
    const parsed = registerSchema.safeParse({ ...alice, acceptedTerms: true, password: "DavaoStrong2026" });
    expect(parsed.success).toBe(true);
    expect(registerSchema.safeParse({ ...alice, acceptedTerms: true, password: "short" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "secret" }).success).toBe(false);
    const passwordHash = await bcrypt.hash("DavaoStrong2026", 12);
    await User.create({ ...alice, passwordHash, email: alice.email.toUpperCase() });
    await expect(User.create({ ...alice, email: "other@example.com" })).rejects.toMatchObject({ code: 11000 });
    await expect(User.create({ ...bob, username: alice.username })).rejects.toMatchObject({ code: 11000 });
    const user = await User.findOne({ email: alice.email }).select("+passwordHash");
    expect(await bcrypt.compare("DavaoStrong2026", user!.passwordHash)).toBe(true);
    expect(await bcrypt.compare("wrong", user!.passwordHash)).toBe(false);
  });

  it("consumes reset tokens once, rejects expired tokens, and revokes sessions", async () => {
    const user = await User.findOne({ email: alice.email });
    const plainToken = "a-secure-one-time-password-reset-token";
    await EmailToken.create({ userId: user!._id, type: "reset", tokenHash: hashToken(plainToken), expiresAt: new Date(Date.now() + 30_000) });
    await Session.create({ userId: user!._id, tokenHash: hashToken("session-token-one"), expiresAt: new Date(Date.now() + 60_000) });
    const consumed = await EmailToken.findOneAndUpdate({ tokenHash: hashToken(plainToken), type: "reset", usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { returnDocument: "after" });
    expect(consumed).not.toBeNull();
    const reused = await EmailToken.findOneAndUpdate({ tokenHash: hashToken(plainToken), type: "reset", usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { returnDocument: "after" });
    expect(reused).toBeNull();
    await EmailToken.create({ userId: user!._id, type: "reset", tokenHash: hashToken("expired-reset-token-value-123456"), expiresAt: new Date(Date.now() - 1000) });
    expect(await EmailToken.findOne({ tokenHash: hashToken("expired-reset-token-value-123456"), expiresAt: { $gt: new Date() } })).toBeNull();
    await Session.deleteMany({ userId: user!._id });
    expect(await Session.countDocuments({ userId: user!._id })).toBe(0);
  });
});

describe("posts and unique social relationships", () => {
  it("creates and retrieves a community post with an optional donation QR", async () => {
    const user = await User.findOne({ email: alice.email });
    const postInput = { title: "Drain blocked on the lane", caption: "The drain near the footbridge is blocked after heavy rain.", category: "Flooding and Disaster", requestType: "Report a Problem", location: "Matina", images: [] };
    expect(postSchema.safeParse(postInput).success).toBe(true);
    const post = await Post.create({ ...postInput, authorId: user!._id, donation: { enabled: false } });
    const qr = { url: "https://res.cloudinary.com/example/image/upload/v1/qr.png", publicId: "bayanihan/user/donations/qr", width: 600, height: 600 };
    const donationPost = postSchema.safeParse({ ...postInput, donation: { enabled: true, provider: "GCash", displayName: "Ari Community", qrImage: qr } });
    expect(donationPost.success).toBe(true);
    expect(postSchema.safeParse({ ...postInput, donation: { enabled: true, provider: "GCash" } }).success).toBe(false);
    expect(await Post.findById(post._id).lean()).toMatchObject({ caption: postInput.caption, location: "Matina" });
  });

  it("prevents duplicate likes, bookmarks, and follows and supports removing each relationship", async () => {
    const first = await User.findOne({ email: alice.email });
    let second = await User.findOne({ email: bob.email });
    if (!second) second = await User.create(bob);
    const post = await Post.findOne({ authorId: first!._id });
    await Like.create({ userId: second._id, postId: post!._id });
    await expect(Like.create({ userId: second._id, postId: post!._id })).rejects.toMatchObject({ code: 11000 });
    expect(await Like.findOneAndDelete({ userId: second._id, postId: post!._id })).not.toBeNull();
    await SavedPost.create({ userId: second._id, postId: post!._id });
    await expect(SavedPost.create({ userId: second._id, postId: post!._id })).rejects.toMatchObject({ code: 11000 });
    await SavedPost.deleteOne({ userId: second._id, postId: post!._id });
    await Follow.create({ followerId: second._id, followingId: first!._id });
    await expect(Follow.create({ followerId: second._id, followingId: first!._id })).rejects.toMatchObject({ code: 11000 });
    await Follow.deleteOne({ followerId: second._id, followingId: first!._id });
    expect(await Follow.countDocuments({ followerId: second._id })).toBe(0);
  });

  it("validates comments, report targets, and cursor based pagination", async () => {
    expect(commentSchema.safeParse({ content: "" }).success).toBe(false);
    expect(commentSchema.safeParse({ content: "A helpful update." }).success).toBe(true);
    expect(reportSchema.safeParse({ targetType: "post", targetId: "invalid", reason: "Abuse" }).success).toBe(false);
    const id = new mongoose.Types.ObjectId(); const date = new Date("2026-10-27T10:00:00.000Z");
    const decoded = decodeCursor(encodeCursor(date, id));
    expect(decoded?.createdAt.toISOString()).toBe(date.toISOString());
    expect(String(decoded?.id)).toBe(String(id));
    expect(resetSchema.safeParse({ token: "short", password: "DavaoStrong2026" }).success).toBe(false);
    const post = await Post.findOne({ authorId: (await User.findOne({ email: alice.email }))!._id });
    const comment = await Comment.create({ authorId: (await User.findOne({ email: bob.email }))!._id, postId: post!._id, content: "Thanks for sharing this update." });
    expect(await Comment.findById(comment._id).lean()).toMatchObject({ content: "Thanks for sharing this update." });
    await Comment.deleteOne({ _id: comment._id });
  });

  it("rejects media uploaded to a different account folder", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "example";
    const image = { url: "https://res.cloudinary.com/example/image/upload/v1/bayanihan/someone-else/posts/photo.jpg", publicId: "bayanihan/someone-else/posts/photo", width: 600, height: 400 };
    expect(() => validateOwnedImage(image, "current-user")).toThrow(/own account/);
  });

  it("enforces and resets a shared database-backed request window", async () => {
    const request = new Request("http://localhost/api/test", { headers: { "x-forwarded-for": "203.0.113.42" } });
    await rateLimit(request, "unit-test-rate", 2, 60_000);
    await rateLimit(request, "unit-test-rate", 2, 60_000);
    await expect(rateLimit(request, "unit-test-rate", 2, 60_000)).rejects.toMatchObject({ status: 429 });
    const key = createHash("sha256").update("unit-test-rate:203.0.113.42").digest("hex");
    await Throttle.updateOne({ key }, { $set: { expiresAt: new Date(Date.now() - 1_000), count: 100 } });
    await rateLimit(request, "unit-test-rate", 2, 60_000);
    const entry = await Throttle.findOne({ key }).lean();
    expect(entry?.count).toBe(1);
  });
});
