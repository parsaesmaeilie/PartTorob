"use client";

import { Ban, CheckCircle2, Loader2, RefreshCw, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { postJson } from "@/components/actions";

export function StatusButtons({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const set = (s: "active" | "blocked") =>
    start(async () => {
      setError(null);
      try {
        await postJson(`/api/admin/users/${userId}/status`, { status: s }, "PATCH");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });
  return (
    <div className="flex flex-wrap items-center gap-1">
      {pending && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
      {status === "pending" && (
        <button onClick={() => set("active")} disabled={pending} className="chip bg-emerald-600 text-white hover:bg-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> تأیید
        </button>
      )}
      {status === "blocked" ? (
        <button onClick={() => set("active")} disabled={pending} className="chip border border-line hover:border-emerald-600">
          <Undo2 className="h-3.5 w-3.5" /> رفع مسدودی
        </button>
      ) : (
        <button onClick={() => set("blocked")} disabled={pending} className="chip border border-line text-brand hover:border-brand">
          <Ban className="h-3.5 w-3.5" /> مسدود
        </button>
      )}
      {error && <span className="text-[11px] text-brand">{error}</span>}
    </div>
  );
}

export function ReindexButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await postJson("/api/admin/reindex");
            setNote(`${r.productCount} محصول از ${r.rawCount} آگهی در ${r.durationMs}ms`);
            router.refresh();
          })
        }
        className="btn-ghost py-2"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> خزش مجدد فروشگاه‌ها
      </button>
      {note && <span className="text-xs text-emerald-700" dir="ltr">{note}</span>}
    </div>
  );
}
