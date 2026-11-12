"use client";

import { Loader2, Phone, ShieldCheck, Store, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OtpStep, ROLE_HOME, openSession, requestOtp, type OtpSent } from "@/components/auth/OtpStep";

const DEMO = [
  { phone: "09120000003", label: "کاربر عادی", Icon: User },
  { phone: "09120000002", label: "فروشنده", Icon: Store },
  { phone: "09120000001", label: "ادمین", Icon: ShieldCheck },
];

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);

  async function send(p = phone) {
    setBusy(true);
    setError(null);
    setNotRegistered(false);
    try {
      const s = await requestOtp(p);
      if (!s.isRegistered) {
        setNotRegistered(true);
        return;
      }
      setSent(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <OtpStep
        sent={sent}
        onEditPhone={() => setSent(null)}
        onResend={async () => setSent(await requestOtp(sent.phone))}
        onVerify={async (code) => {
          const s = await openSession({ mode: "login", phone: sent.phone, code });
          router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : ROLE_HOME[s.role] ?? "/");
          router.refresh();
        }}
      />
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">شماره موبایل</span>
        <div className="relative">
          <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoFocus
            placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷"
            dir="ltr"
            className="input py-3 pr-10 text-left text-lg tracking-wider"
          />
        </div>
      </label>
      {error && <p className="text-sm text-brand">{error}</p>}
      {notRegistered && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          این شماره هنوز ثبت‌نام نکرده.{" "}
          <Link href={`/signup?phone=${encodeURIComponent(phone)}`} className="font-bold text-brand">
            ثبت‌نام کنید
          </Link>
        </div>
      )}
      <button className="btn-primary w-full py-3" disabled={busy || phone.length < 10}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} دریافت کد ورود
      </button>
      <p className="text-center text-sm text-muted">
        حساب ندارید؟{" "}
        <Link href="/signup" className="font-bold text-brand">
          ثبت‌نام
        </Link>
      </p>

      <div className="rounded-2xl border border-dashed border-line p-3">
        <div className="mb-2 text-xs font-bold text-muted">حساب‌های نمایشی (برای دمو)</div>
        <div className="grid grid-cols-3 gap-2">
          {DEMO.map(({ phone: p, label, Icon }) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPhone(p);
                void send(p);
              }}
              className="flex flex-col items-center gap-1 rounded-xl bg-canvas p-2 text-xs hover:bg-brand-soft hover:text-brand"
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="font-mono text-[10px] text-muted" dir="ltr">
                {p}
              </span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
