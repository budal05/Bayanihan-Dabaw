"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { apiRequest } from "@/lib/client";

export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<"checking" | "success" | "error">(token ? "checking" : "error"); const [message, setMessage] = useState(token ? "Confirming your email address…" : "This verification link is missing its token. Please request a new link.");
  useEffect(() => {
    if (!token) return;
    let alive = true;
    apiRequest<{ message: string }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }).then((result) => { if (alive) { setState("success"); setMessage(result.message); } }).catch((error) => { if (alive) { setState("error"); setMessage(error instanceof Error ? error.message : "This verification link could not be used."); } });
    return () => { alive = false; };
  }, [token]);
  return <div className="card" style={{ maxWidth: 470, margin: "28px auto", padding: 25, textAlign: "center" }}><span className="empty-icon" style={{ margin: "0 auto 14px", color: state === "error" ? "#a76558" : undefined }}>{state === "checking" ? <LoaderCircle size={23} className="animate-spin" /> : state === "success" ? <CheckCircle2 size={23} /> : <CircleAlert size={23} />}</span><h1 className="auth-heading">{state === "checking" ? "One moment" : state === "success" ? "You’re verified" : "Could not verify"}</h1><p className="auth-copy" style={{ marginBottom: 18 }}>{message}</p><Link className="button" href="/login">Continue to sign in</Link></div>;
}
