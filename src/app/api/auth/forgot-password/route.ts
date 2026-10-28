import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { api, json, readBody, assertSameOrigin } from "@/lib/http";
import { createOneTimeToken } from "@/lib/auth";
import { sendEmail, safeEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email().max(254) });
export const POST = api(async (request) => {
  assertSameOrigin(request);
  await rateLimit(request, "forgot-password", 5, 60 * 60 * 1000);
  const { email } = await readBody(request, schema);
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase(), status: "active" }).select("name email");
  if (user) {
    const token = await createOneTimeToken(String(user._id), "reset", 30);
    const link = `${process.env.APP_URL ?? new URL(request.url).origin}/reset-password?token=${encodeURIComponent(token)}`;
    try { await sendEmail(user.email, "Reset your Bayanihan Dabaw password", `<p>Hi ${safeEmail(user.name)},</p><p>We received a request to reset your password. This link expires in 30 minutes and can only be used once.</p><p><a href="${link}">Choose a new password</a></p><p>If you did not request this, ignore this email. Your password has not changed.</p>`); }
    catch (error) { console.error("Password reset email could not be sent", error); }
  }
  return json({ message: "If an account matches that email, we sent a password reset link." });
});
