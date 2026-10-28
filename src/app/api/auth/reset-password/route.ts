import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { EmailToken, Session, User } from "@/lib/models";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { resetSchema } from "@/lib/schemas";
import { hashToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const POST = api(async (request) => {
  assertSameOrigin(request);
  await rateLimit(request, "reset-password", 10, 15 * 60 * 1000);
  await connectDB();
  const { token, password } = await readBody(request, resetSchema);
  const record = await EmailToken.findOneAndUpdate({ tokenHash: hashToken(token), type: "reset", usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { returnDocument: "after" });
  if (!record) throw new ApiError(400, "This reset link is invalid or has expired. Request a new link.");
  await User.updateOne({ _id: record.userId }, { $set: { passwordHash: await bcrypt.hash(password, 12) } });
  await EmailToken.updateMany({ userId: record.userId, type: "reset", usedAt: null }, { $set: { usedAt: new Date() } });
  await Session.deleteMany({ userId: record.userId });
  return json({ message: "Your password was changed. Sign in with your new password." });
});
