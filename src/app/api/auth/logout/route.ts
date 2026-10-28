import { api, json, assertSameOrigin } from "@/lib/http";
import { clearSession } from "@/lib/auth";

export const POST = api(async (request) => {
  assertSameOrigin(request);
  await clearSession();
  return json({ message: "You are signed out." });
});
