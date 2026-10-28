import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { api, json, readBody, assertSameOrigin } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { createOneTimeToken } from "@/lib/auth";
import { sendEmail, safeEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const POST = api(async (request) => {
  assertSameOrigin(request);
  await rateLimit(request, "register", 5, 60 * 60 * 1000);
  const input = await readBody(request, registerSchema);
  await connectDB();
  const email = input.email.toLowerCase();
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const user = await User.create({ name: input.name, nameSearch: input.name.toLowerCase(), username: input.username, email, passwordHash: await bcrypt.hash(input.password, 12), termsAcceptedAt: new Date(), role: adminEmail && email === adminEmail ? "admin" : "user" });
  const token = await createOneTimeToken(String(user._id), "verify", 24 * 60);
  const link = `${process.env.APP_URL ?? new URL(request.url).origin}/verify-email?token=${encodeURIComponent(token)}`;
  try { await sendEmail(email, "Verify your Bayanihan Dabaw account", `<p>Kumusta, ${safeEmail(input.name)}!</p><p>Confirm your email to start sharing with your community.</p><p><a href="${link}">Verify my email</a></p><p>This link expires in 24 hours. If you did not create an account, you can ignore this message.</p>`); }
  catch (error) { console.error("Verification email could not be sent", error); }
  return json({ message: "Account created. Check your inbox for an email verification link." }, 201);
});
