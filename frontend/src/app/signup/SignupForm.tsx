"use client";

import { Car, Loader2, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OtpStep, openSession, requestOtp, type OtpSent } from "@/components/auth/OtpStep";

type Role = "customer" | "seller";

export function SignupForm({ initialPhone = "" }: { initialPhone?: string }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [shopName, setShopName] = useState("");
  const [shopWebsite, setShopWebsite] = useState("");
  const [sent, setSent] = useState<OtpSent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);

  if (sent)
    return (
      <OtpStep
        sent={sent}
        onEditPhone={() => setSent(null)}
        onResend={async () => setSent(await requestOtp(sent.phone))}
        onVerify={async (code) => {
          await openSession({ mode: "signup", phone: sent.phone, code, name, role, shopName: role === "seller" ? shopName : null, shopWebsite: role === "seller" ? shopWebsite : null });
          // new customers start by adding their car; new shops wait for approval
          router.replace(role === "seller" ? "/seller" : "/garage?welcome=1");
          router.refresh();
        }}
      />
    );

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setExists(false);
        try {
          const s = await requestOtp(phone);
          if (s.isRegistered) setExists(true);
          else setSent(s);
        } catch (err) {
          setError(err instanceof Error ? err.message : "خطا");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع حساب">
        {(
          [
            { id: "customer", t: "صاحب خودرو", d: "مقایسه قیمت و گاراژ من", Icon: Car },
            { id: "seller", t: "فروشنده قطعه", d: "فروشگاهم را ثبت کنم", Icon: Store },
          ] as const
        ).map(({ id, t, d, Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={role === id}
            onClick={() => setRole(id)}
            className={`rounded-2xl border-2 p-3 text-right transition ${role === id ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40"}`}
          >
            <Icon className={`h-6 w-6 ${role === id ? "text-brand" : "text-muted"}`} />
            <div className="mt-2 text-sm font-bold">{t}</div>
            <div className="text-[11px] text-muted">{d}</div>
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="نام و نام خانوادگی" className="input py-3" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" dir="ltr" placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷" className="input py-3 text-left tracking-wider" />
      {role === "seller" && (
        <>
          <input value={shopName} onChange={(e) => setShopName(e.target.value)} required placeholder="نام فروشگاه" className="input py-3" />
          <label className="block">
            <input
              value={shopWebsite}
              onChange={(e) => setShopWebsite(e.target.value)}
              required
              inputMode="url"
              dir="ltr"
              placeholder="https://myshop.ir"
              className="input py-3 text-left"
              aria-label="آدرس سایت فروشگاه"
            />
            <span className="mt-1 block text-[11px] text-muted">آدرس سایت فروشگاه — خریداران با کلیک «خرید» به همین سایت هدایت می‌شوند.</span>
          </label>
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">حساب فروشگاه پس از بررسی و تأیید ادمین فعال می‌شود.</p>
        </>
      )}
      {error && <p className="text-sm text-brand">{error}</p>}
      {exists && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          این شماره قبلاً ثبت‌نام کرده.{" "}
          <Link href="/login" className="font-bold text-brand">
            وارد شوید
          </Link>
        </p>
      )}
      <button className="btn-primary w-full py-3" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} دریافت کد تأیید
      </button>
      <p className="text-center text-sm text-muted">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/login" className="font-bold text-brand">
          ورود
        </Link>
      </p>
    </form>
  );
}
