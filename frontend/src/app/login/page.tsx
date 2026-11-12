import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="ورود به قطعه ترب" subtitle="با شماره موبایل وارد شوید؛ کد یک‌بار مصرف برایتان ارسال می‌شود.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
