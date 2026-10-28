import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(data: unknown, status = 200) { return NextResponse.json(data, { status }); }

export function api(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      if (error instanceof ZodError) return json({ error: "Please check the information you entered.", fields: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, 400);
      if (error && typeof error === "object" && "code" in error && error.code === 11000) return json({ error: "That email address or username is already in use." }, 409);
      console.error("API request failed", error);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}

export async function readBody<T>(request: Request, schema: { parse: (value: unknown) => T }) {
  let value: unknown;
  try { value = await request.json(); } catch { throw new ApiError(400, "Please send valid JSON."); }
  return schema.parse(value);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin && fetchSite === "cross-site") throw new ApiError(403, "This request could not be verified.");
  if (!origin) return;
  const allowed = new Set<string>();
  try { allowed.add(new URL(request.url).origin); } catch { /* invalid request URL */ }
  if (process.env.APP_URL) { try { allowed.add(new URL(process.env.APP_URL).origin); } catch { /* invalid setup is rejected below */ } }
  if (!allowed.has(origin)) throw new ApiError(403, "This request could not be verified.");
}

export function assertObjectId(id: string, label = "record") {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new ApiError(404, `${label} not found.`);
}
