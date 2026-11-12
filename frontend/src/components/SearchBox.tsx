"use client";

import { Camera, Loader2, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

export function SearchBox({ big = false }: { big?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImage(file: File) {
    setBusy(true);
    setNote(null);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch("/api/assistant/image-search", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.detail ?? "خطا");
      router.push(`/search?q=${encodeURIComponent(j.query)}&via=image&note=${encodeURIComponent(j.note)}`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // keep the "all cars" toggle sticky across new searches
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}${params.get("any") === "1" ? "&any=1" : ""}`);
        }}
        className={`flex items-center gap-2 rounded-2xl border border-line bg-white pr-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 ${big ? "p-2 shadow-lg shadow-black/5" : "p-1"}`}
      >
        <Search className="h-5 w-5 shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جست‌وجوی قطعه، برند یا سؤال… مثلاً «روغن موتور ارزان برای ۲۰۶»"
          className={`min-w-0 flex-1 bg-transparent outline-none ${big ? "py-2 text-base" : "py-1.5 text-sm"}`}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl p-2 text-muted hover:text-brand" title="جست‌وجو با عکس قطعه">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </button>
        <button className={`btn-primary ${big ? "" : "px-3 py-1.5"}`}>جست‌وجو</button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} />
      </form>
      {note && <p className="absolute mt-1 text-xs text-brand">{note}</p>}
    </div>
  );
}
