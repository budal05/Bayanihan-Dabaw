"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";
import { AuthFrame } from "@/components/auth-frame";
import { apiRequest } from "@/lib/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { const result = await apiRequest<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }); setMessage(result.message); } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again in a moment."); } finally { setBusy(false); } };
  return <AuthFrame title="Reset your password" description="We’ll send a secure, time-limited link if an account matches your email."><form onSubmit={(event) => void submit(event)}>{error && <div className="error-box" role="alert">{error}</div>}{message ? <div className="success-box" role="status"><MailCheck size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />{message}</div> : <><div className="field"><label htmlFor="email">Email address</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div><button className="button full" disabled={busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : null}Send reset link</button></>}<div className="auth-footer"><Link href="/login" className="auth-link"><ArrowLeft size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Back to sign in</Link></div></form></AuthFrame>;
}
