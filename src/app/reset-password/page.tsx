import { ResetPassword } from "@/components/reset-password";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPassword token={token ?? ""} />;
}
