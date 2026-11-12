"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { postJson } from "@/components/actions";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n: number) => n.toLocaleString("en-US").replace(/\d/g, (d) => FA[+d]);
const latin = (s: string) => Number(s.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/\D/g, ""));

export function PriceEditor({ productId, price, inStock, suggested, disabled }: { productId: string; price: number; inStock: boolean; suggested: number | null; disabled: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(fa(price));
  const [stock, setStock] = useState(inStock);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = latin(value) !== price || stock !== inStock;

  const save = (p = latin(value), s = stock) =>
    start(async () => {
      setMsg(null);
      try {
        await postJson(`/api/seller/offers/${productId}`, { priceToman: p, inStock: s }, "PATCH");
        setMsg({ ok: true, text: "ذخیره شد" });
        router.refresh();
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "خطا" });
      }
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(fa(latin(e.target.value)))}
          inputMode="numeric"
          aria-label="قیمت (تومان)"
          className="input w-32 py-1.5 text-left font-bold"
          dir="ltr"
        />
        <label className="flex cursor-pointer items-center gap-1 text-xs">
          <input type="checkbox" checked={stock} disabled={disabled} onChange={(e) => setStock(e.target.checked)} className="accent-[#e3262f]" />
          موجود
        </label>
        <button onClick={() => save()} disabled={disabled || !dirty || pending} className="btn-primary px-3 py-1.5 text-xs">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} ذخیره
        </button>
      </div>
      {suggested && !disabled && (
        <button
          onClick={() => {
            setValue(fa(suggested));
            save(suggested, true);
          }}
          className="flex w-fit items-center gap-1 text-[11px] text-emerald-700 hover:underline"
        >
          <Sparkles className="h-3 w-3" /> با {fa(suggested)} تومان ارزان‌ترین فروشنده می‌شوید
        </button>
      )}
      {msg && <span className={`text-[11px] ${msg.ok ? "text-emerald-700" : "text-brand"}`}>{msg.text}</span>}
    </div>
  );
}
