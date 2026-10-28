import { Types } from "mongoose";
import { ApiError } from "@/lib/http";

export type Cursor = { createdAt: Date; id: Types.ObjectId; likes?: number; comments?: number };
export function decodeCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { t: string; id: string; l?: number; c?: number };
    const createdAt = new Date(parsed.t);
    if (Number.isNaN(createdAt.getTime()) || !/^[a-f\d]{24}$/i.test(parsed.id)) throw new Error("Invalid cursor");
    return { createdAt, id: new Types.ObjectId(parsed.id), ...(Number.isFinite(parsed.l) ? { likes: parsed.l } : {}), ...(Number.isFinite(parsed.c) ? { comments: parsed.c } : {}) };
  } catch { throw new ApiError(400, "The page cursor is invalid. Refresh and try again."); }
}

export function encodeCursor(createdAt: Date, id: unknown) {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id: String(id) })).toString("base64url");
}

export function encodePopularityCursor(likes: number, comments: number, createdAt: Date, id: unknown) {
  return Buffer.from(JSON.stringify({ l: likes, c: comments, t: createdAt.toISOString(), id: String(id) })).toString("base64url");
}
