import { ApiError } from "@/lib/http";

export type ImageRecord = { url: string; publicId: string; width?: number; height?: number };

export function validateOwnedImage(image: ImageRecord, userId: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new ApiError(503, "Photo uploads are not configured yet.");
  let url: URL;
  try { url = new URL(image.url); } catch { throw new ApiError(400, "Please choose a valid uploaded photo."); }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.includes(`/image/upload/`) || !url.pathname.includes(encodeURIComponent(cloudName)) && !url.pathname.startsWith(`/${cloudName}/`)) {
    throw new ApiError(400, "Please choose a valid uploaded photo.");
  }
  if (!image.publicId.startsWith(`bayanihan/${userId}/`) || image.publicId.length > 250) throw new ApiError(403, "You can only use photos uploaded to your own account.");
  let normalizedPath: string;
  try { normalizedPath = decodeURIComponent(url.pathname); } catch { throw new ApiError(400, "The photo details do not match."); }
  if (!normalizedPath.includes(image.publicId)) throw new ApiError(400, "The photo details do not match.");
}

export function validateOwnedImages(images: ImageRecord[], userId: string) { for (const image of images) validateOwnedImage(image, userId); }
