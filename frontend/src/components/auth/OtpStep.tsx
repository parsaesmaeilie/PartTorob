"use client";

import { Loader2, MessageSquareText, RotateCcw, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface OtpSent {
  phone: string;
  expiresIn: number;
  resendIn: number;
  isRegistered: boolean;
  devCode: string | null;
}

const LEN = 5;
const FA = "۰۱۲۳۴۵۶۷۸۹";
const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/\D/g, "");
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => FA[+d]);

export async function requestOtp(phone: string): Promise<OtpSent> {
  const res = await fetch("/api/auth/otp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof j.detail === "string" ? j.detail : "شماره موبایل معتبر نیست");
  return j as OtpSent;
}

/** Simulated SMS: in demo mode the code is shown on screen instead of being texted. */
export function SmsToast({ code, phone, onFill }: { code: string; phone: string; onFill: () => void }) {
  return (
    <div className="animate-[slidein_.4s_ease-out] rounded-2xl border border-line bg-white p-3 shadow-xl shadow-black/10">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500 text-white">
          <MessageSquareText className="h-3.5 w-3.5" />
        </span>
        پیامک · همین الان · به {fa(phone)}
      </div>
      <div className="mt-2 text-sm leading-7">
        <b>قطعه ترب</b>
        <br />
        کد ورود شما: <span className="font-mono text-lg font-black tracking-[.3em] text-brand" dir="ltr">{code}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="text-[10px] text-muted">حالت نمایشی: به‌جای ارسال پیامک، کد اینجا نشان داده می‌شود</span>
        <button type="button" onClick={onFill} className="chip shrink-0 bg-brand-soft text-brand hover:bg-brand hover:text-white">
          <Wand2 className="h-3 w-3" /> پر کردن
        </button>
      </div>
    </div>
  );
}

export function OtpStep({ sent, onVerify, onResend, onEditPhone }: { sent: OtpSent; onVerify: (code: string) => Promise<void>; onResend: () => Promise<void>; onEditPhone: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(sent.resendIn);
  const [expires, setExpires] = useState(sent.expiresIn);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLeft(sent.resendIn);
    setExpires(sent.expiresIn);
    setDigits(Array(LEN).fill(""));
    refs.current[0]?.focus();
    const t = setInterval(() => {
      setLeft((x) => Math.max(0, x - 1));
      setExpires((x) => Math.max(0, x - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [sent]);

  async function submit(code: string) {
    if (code.length !== LEN || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onVerify(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
      setDigits(Array(LEN).fill(""));
      refs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function setAt(i: number, raw: string) {
    const v = latin(raw);
    const next = [...digits];
    if (v.length > 1) {
      // paste of the whole code
      v.slice(0, LEN).split("").forEach((d, k) => (next[k] = d));
      setDigits(next);
      refs.current[Math.min(v.length, LEN) - 1]?.focus();
      if (v.length >= LEN) void submit(next.join(""));
      return;
    }
    next[i] = v;
    setDigits(next);
    if (v && i < LEN - 1) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) void submit(next.join(""));
  }

  const fill = () => {
    if (!sent.devCode) return;
    setDigits(sent.devCode.split(""));
    void submit(sent.devCode);
  };

  return (
    <div className="space-y-4">
      {sent.devCode && <SmsToast code={sent.devCode} phone={sent.phone} onFill={fill} />}
      <div>
        <p className="text-sm text-muted">
          کد {fa(LEN)} رقمی ارسال‌شده به <b className="text-ink" dir="ltr">{fa(sent.phone)}</b> را وارد کنید.{" "}
          <button type="button" onClick={onEditPhone} className="text-brand">
            ویرایش شماره
          </button>
        </p>
      </div>
      <div className="flex justify-center gap-2" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`رقم ${i + 1}`}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && refs.current[i - 1]?.focus()}
            className={`h-14 w-12 rounded-xl border-2 bg-white text-center text-2xl font-black outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 ${error ? "border-brand" : "border-line"}`}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-brand">{error}</p>}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{expires > 0 ? `اعتبار کد: ${fa(Math.floor(expires / 60))}:${fa(String(expires % 60).padStart(2, "0"))}` : "کد منقضی شد"}</span>
        <button
          type="button"
          disabled={left > 0}
          onClick={async () => {
            setError(null);
            try {
              await onResend();
            } catch (e) {
              setError(e instanceof Error ? e.message : "خطا");
            }
          }}
          className="flex items-center gap-1 text-brand disabled:text-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {left > 0 ? `ارسال دوباره تا ${fa(left)} ثانیه` : "ارسال دوباره کد"}
        </button>
      </div>
      <button type="button" disabled={busy || digits.some((x) => !x)} onClick={() => submit(digits.join(""))} className="btn-primary w-full py-3">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} تأیید و ورود
      </button>
    </div>
  );
}

export const ROLE_HOME: Record<string, string> = { admin: "/admin", seller: "/seller", customer: "/" };

export async function openSession(body: Record<string, unknown>): Promise<{ role: string; status: string }> {
  const res = await fetch("/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof j.detail === "string" ? j.detail : "ورود ناموفق بود");
  return j;
}
