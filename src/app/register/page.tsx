"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthFrame } from "@/components/auth-frame";
import { apiRequest } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter(); const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [acceptedTerms, setAcceptedTerms] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try { const response = await apiRequest<{ message: string }>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, username, email, password, acceptedTerms }) }); setSuccess(response.message); window.setTimeout(() => router.push("/login"), 2300); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create your account."); }
    finally { setBusy(false); }
  };
  return <AuthFrame title="Join the community" description="Create an account to share local updates, connect with neighbors, and lend a hand."><form onSubmit={(event) => void submit(event)}>{error && <div className="error-box" role="alert">{error}</div>}{success && <div className="success-box" role="status">{success}</div>}<div className="field"><label htmlFor="name">Your name</label><input id="name" className="input" autoComplete="name" minLength={2} maxLength={60} required value={name} onChange={(event) => setName(event.target.value)} placeholder="How neighbors will know you" /></div><div className="field"><label htmlFor="username">Username</label><input id="username" className="input" autoComplete="username" pattern="[A-Za-z0-9_]{3,24}" required value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} placeholder="e.g. davao_neighbor" /><span className="field-hint">3–24 letters, numbers, or underscores.</span></div><div className="field"><label htmlFor="email">Email address</label><input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div><div className="field"><label htmlFor="password">Password</label><input id="password" className="input" type="password" autoComplete="new-password" minLength={10} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /><span className="field-hint">Use at least 10 characters, with an uppercase letter, lowercase letter, and number.</span></div><label style={{ display: "flex", alignItems: "flex-start", gap: 9, margin: "2px 0 16px", color: "#77837b", fontSize: 10, lineHeight: 1.55 }}><input type="checkbox" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} style={{ accentColor: "var(--forest)", marginTop: 2 }} />I agree to the <Link className="auth-link" href="/terms">Terms of Service</Link> and <Link className="auth-link" href="/privacy">Privacy Policy</Link>.</label><button className="button full" type="submit" disabled={busy || Boolean(success)}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : null}{busy ? "Creating account…" : "Create account"}</button><div className="auth-footer" style={{ justifyContent: "center" }}>Already a member? <Link className="auth-link" href="/login">Sign in</Link></div></form></AuthFrame>;
}
