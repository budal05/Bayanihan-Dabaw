import { connectDB } from "@/lib/db";
import { EmailToken, User } from "@/lib/models";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { hashToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ token: z.string().min(20).max(200) });
export const POST = api(async (request) => {
  assertSameOrigin(request);
  await rateLimit(request, "verify-email", 10, 60 * 60 * 1000);
  await connectDB();
  const { token } = await readBody(request, schema);
  const record = await EmailToken.findOneAndUpdate({ tokenHash: hashToken(token), type: "verify", usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { returnDocument: "after" });
  if (!record) throw new ApiError(400, "This verification link is invalid or has expired. Request a new one from the sign in page.");
  await User.updateOne({ _id: record.userId }, { $set: { emailVerifiedAt: new Date() } });
  return json({ message: "Your email is verified. You can now sign in." });
});
