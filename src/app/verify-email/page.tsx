import { Suspense } from "react";
import { VerifyEmail } from "@/components/verify-email";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <Suspense fallback={<div className="card" style={{ maxWidth: 450, margin: "25px auto", padding: 25 }}>Checking your verification link…</div>}><VerifyEmail token={token ?? ""} /></Suspense>;
}
