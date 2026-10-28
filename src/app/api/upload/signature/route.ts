import { v2 as cloudinary } from "cloudinary";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { ApiError, api, assertSameOrigin, json, readBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ purpose: z.enum(["profile", "posts", "donations"]) });
export const POST = api(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  await rateLimit(request, "upload", 30, 60 * 60 * 1000);
  const { purpose } = await readBody(request, schema);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new ApiError(503, "Photo uploads are not configured yet.");
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `bayanihan/${String(user._id)}/${purpose}/${randomBytes(12).toString("hex")}`;
  const params = { timestamp, public_id: publicId, overwrite: false, allowed_formats: "jpg,jpeg,png,webp", max_file_size: 8 * 1024 * 1024 };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return json({ cloudName, apiKey, timestamp, publicId, signature, params, maxBytes: 8 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp"] });
});
