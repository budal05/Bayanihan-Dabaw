export async function apiRequest<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string } & T;
  if (!response.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
  return body;
}

export function toast(message: string, kind: "success" | "error" = "success") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("bd-toast", { detail: { message, kind } }));
}

export function formatDate(value: string | Date) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
