import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const POST = api(async (request) => {
  assertSameOrigin(request);
  await rateLimit(request, "login", 10, 15 * 60 * 1000);
  const input = await readBody(request, loginSchema);
  await connectDB();
  const user = await User.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new ApiError(401, "Email or password is incorrect.");
  if (user.status !== "active") throw new ApiError(403, "This account is not available. Contact support if you need help.");
  if (!user.emailVerifiedAt) throw new ApiError(403, "Please verify your email before signing in.");
  await createSession(String(user._id));
  return json({ user: { id: String(user._id), name: user.name, username: user.username, email: user.email, profileImage: user.profileImage, role: user.role } });
});
