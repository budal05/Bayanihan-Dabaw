import { Resend } from "resend";

export async function sendEmail(to: string, subject: string, html: string) {
  const url = process.env.APP_URL ?? "http://localhost:3000";
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("Email delivery is not configured.");
    // Never write verification or reset URLs (which contain one-time tokens) to logs.
    console.info(`[Bayanihan Dabaw local email preview] To: ${to} | ${subject}. Add RESEND_API_KEY to deliver this message. App: ${url}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM ?? "Bayanihan Dabaw <onboarding@resend.dev>", to, subject, html });
  if (error) throw new Error("Email delivery failed.");
}

export const safeEmail = (s: string) => s.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
