"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { AuthFrame } from "@/components/auth-frame";
import { apiRequest } from "@/lib/client";

function LoginForm() {
  const router = useRouter(); const search = useSearchParams();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [resendMessage, setResendMessage] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); window.dispatchEvent(new Event("bd-auth-changed")); const next = search.get("next"); router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not sign in."); }
    finally { setBusy(false); }
  };
  const resend = async () => { try { const result = await apiRequest<{ message: string }>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }); setResendMessage(result.message); } catch (caught) { setResendMessage(caught instanceof Error ? caught.message : "Could not send a verification link."); } };
  return <AuthFrame title="Welcome back" description="Sign in to stay close to your community."><form onSubmit={(event) => void submit(event)}>{error && <div className="error-box" role="alert">{error}</div>}{resendMessage && <div className="success-box" role="status">{resendMessage}</div>}<div className="field"><label htmlFor="email">Email address</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div><div className="field"><label htmlFor="password">Password</label><input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></div><div style={{ display: "flex", justifyContent: "space-between", margin: "-3px 0 16px", fontSize: 10 }}><button type="button" className="auth-link" style={{ border: 0, background: "none", padding: 0 }} onClick={() => void resend()}>Resend verification link</button><Link className="auth-link" href="/forgot-password">Forgot password?</Link></div><button className="button full" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : null}{busy ? "Signing in…" : "Sign in"}<ArrowRight size={15} /></button><div className="auth-footer" style={{ justifyContent: "center" }}>New to the community? <Link className="auth-link" href="/register">Create an account</Link></div></form></AuthFrame>;
}

export default function LoginPage() { return <Suspense fallback={<div className="post-skeleton" style={{ maxWidth: 500, margin: "30px auto" }} /> }><LoginForm /></Suspense>; }
