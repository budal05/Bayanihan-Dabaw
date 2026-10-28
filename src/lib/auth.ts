import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { EmailToken, Session, User } from "@/lib/models";
import { ApiError } from "@/lib/http";
import { SESSION_DAYS } from "@/lib/constants";

export const SESSION_COOKIE = "bd_session";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

export async function createSession(userId: string) {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await Session.create({ userId, tokenHash: hashToken(token), expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) { await connectDB(); await Session.deleteOne({ tokenHash: hashToken(token) }); }
  jar.set(SESSION_COOKIE, "", cookieOptions(0));
}

export async function requireUser() {
  await connectDB();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) throw new ApiError(401, "Please sign in to continue.");
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) throw new ApiError(401, "Your session has expired. Please sign in again.");
  const user = await User.findById(session.userId).select("name username email emailVerifiedAt profileImage bio role status donationWallet").lean();
  if (!user || user.status !== "active") throw new ApiError(403, "This account is not available.");
  if (!user.emailVerifiedAt) throw new ApiError(403, "Please verify your email address before continuing.");
  return user;
}

export async function optionalUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).select("name username email emailVerifiedAt profileImage bio role status donationWallet").lean();
  if (!user || user.status !== "active" || !user.emailVerifiedAt) return null;
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "Administrator access is required.");
  return user;
}

export async function createOneTimeToken(userId: string, type: "verify" | "reset", durationMinutes: number) {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  await EmailToken.deleteMany({ userId, type, usedAt: null });
  await EmailToken.create({ userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + durationMinutes * 60_000) });
  return token;
}
