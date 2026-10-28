"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { AuthFrame } from "@/components/auth-frame";
import { apiRequest } from "@/lib/client";

export function ResetPassword({ token }: { token: string }) {
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { const response = await apiRequest<{ message: string }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }); setSuccess(response.message); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not reset your password."); } finally { setBusy(false); } };
  return <AuthFrame title="Choose a new password" description="Your password should be strong and unique to this account."><form onSubmit={(event) => void submit(event)}>{error && <div className="error-box" role="alert">{error}</div>}{success ? <div className="success-box"><CheckCircle2 size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />{success}<div style={{ marginTop: 12 }}><Link href="/login" className="auth-link">Sign in</Link></div></div> : <><div className="field"><label htmlFor="password">New password</label><input id="password" className="input" type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /><span className="field-hint">Include an uppercase letter, lowercase letter, and number.</span></div><button className="button full" disabled={busy || !token}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : null}Save new password</button></> }</form></AuthFrame>;
}
