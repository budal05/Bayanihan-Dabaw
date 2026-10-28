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
  await rateLimit(request, "resend-verification", 5, 60 * 60 * 1000);
  const { email } = await readBody(request, schema);
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase(), status: "active", emailVerifiedAt: null }).select("name email");
  if (user) {
    const token = await createOneTimeToken(String(user._id), "verify", 24 * 60);
    const link = `${process.env.APP_URL ?? new URL(request.url).origin}/verify-email?token=${encodeURIComponent(token)}`;
    try { await sendEmail(user.email, "Verify your Bayanihan Dabaw account", `<p>Kumusta, ${safeEmail(user.name)}!</p><p>Confirm your email to start sharing with your community.</p><p><a href="${link}">Verify my email</a></p><p>This link expires in 24 hours.</p>`); }
    catch (error) { console.error("Verification email could not be sent", error); }
  }
  return json({ message: "If your account needs verification, we sent a fresh link to its email address." });
});
