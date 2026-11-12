import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  return (
    <AuthShell title="ثبت‌نام در قطعه ترب" subtitle="در کمتر از یک دقیقه؛ فقط با شماره موبایل.">
      <SignupForm initialPhone={phone} />
    </AuthShell>
  );
}
