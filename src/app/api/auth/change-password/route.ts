import bcrypt from "bcryptjs";
import { Session, User } from "@/lib/models";
import { requireUser, hashToken, SESSION_COOKIE } from "@/lib/auth";
import { api, json, readBody, assertSameOrigin, ApiError } from "@/lib/http";
import { z } from "zod";
import { cookies } from "next/headers";

const schema = z.object({ currentPassword: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72), newPassword: z.string().min(10).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/) });
export const runtime = "nodejs";
export const POST = api(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { currentPassword, newPassword } = await readBody(request, schema);
  const record = await User.findById(user._id).select("+passwordHash");
  if (!record || !(await bcrypt.compare(currentPassword, record.passwordHash))) throw new ApiError(400, "Your current password is incorrect.");
  record.passwordHash = await bcrypt.hash(newPassword, 12);
  await record.save();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await Session.deleteMany({ userId: user._id, ...(token ? { tokenHash: { $ne: hashToken(token) } } : {}) });
  return json({ message: "Password updated." });
});
