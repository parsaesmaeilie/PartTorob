"use client";

import { GitCompareArrows, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "tm_compare";
const EVT = "tm-compare";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  return {
    ids,
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-4)),
    clear: () => write([]),
  };
}

export function CompareToggle({ id }: { id: string }) {
  const { ids, toggle } = useCompare();
  const on = ids.includes(id);
  return (
    <button onClick={() => toggle(id)} className={`chip border ${on ? "border-navy bg-navy text-white" : "border-line text-muted hover:border-navy"}`}>
      <GitCompareArrows className="h-3.5 w-3.5" /> {on ? "در مقایسه" : "مقایسه"}
    </button>
  );
}

export function CompareBar() {
  const { ids, clear } = useCompare();
  if (ids.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-20 flex justify-center px-4 md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-xl">
        <GitCompareArrows className="h-4 w-4" />
        {ids.length.toLocaleString("fa-IR")} کالا برای مقایسه
        <Link href={`/compare?ids=${ids.join(",")}`} className="rounded-lg bg-brand px-3 py-1.5 font-semibold">
          مقایسه کن
        </Link>
        <button onClick={clear} aria-label="پاک کردن">
          <X className="h-4 w-4 opacity-70" />
        </button>
      </div>
    </div>
  );
}
