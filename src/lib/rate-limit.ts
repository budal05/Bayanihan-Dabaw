import { createHash } from "node:crypto";
import { connectDB } from "@/lib/db";
import { Throttle } from "@/lib/models";
import { ApiError } from "@/lib/http";

export async function rateLimit(request: Request, scope: string, maximum: number, windowMs: number) {
  await connectDB();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = createHash("sha256").update(`${scope}:${ip}`).digest("hex");
  const now = new Date();
  const expiry = new Date(now.getTime() + windowMs);
  const entry = await Throttle.collection.findOneAndUpdate(
    { key },
    [{ $set: { count: { $cond: [{ $gt: ["$expiresAt", now] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] }, expiresAt: { $cond: [{ $gt: ["$expiresAt", now] }, "$expiresAt", expiry] } } }],
    { upsert: true, returnDocument: "after" },
  ) as unknown as { count: number } | null;
  if (entry && entry.count > maximum) throw new ApiError(429, "Too many requests. Please wait a little and try again.");
}
