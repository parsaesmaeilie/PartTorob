"use client";

import { Car, ChevronDown, LayoutDashboard, LogOut, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ROLE = {
  admin: { label: "ادمین", cls: "bg-navy text-white", panel: "/admin", panelLabel: "پنل مدیریت", Icon: ShieldCheck },
  seller: { label: "فروشنده", cls: "bg-amber-100 text-amber-800", panel: "/seller", panelLabel: "پنل فروشنده", Icon: Store },
  customer: { label: "کاربر", cls: "bg-emerald-50 text-emerald-700", panel: null, panelLabel: null, Icon: Car },
} as const;

export function UserMenu({ name, role, phone }: { name: string; role: keyof typeof ROLE; phone: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const r = ROLE[role] ?? ROLE.customer;

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((x) => !x)} className="flex items-center gap-2 rounded-xl border border-line px-2 py-1.5 hover:border-brand" aria-expanded={open}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-black text-white">{name[0]}</span>
        <span className="hidden text-right leading-tight lg:block">
          <span className="block text-xs font-bold">{name}</span>
          <span className={`chip mt-0.5 px-1.5 py-0 text-[10px] ${r.cls}`}>{r.label}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white text-sm shadow-xl">
          <div className="border-b border-line p-3">
            <div className="font-bold">{name}</div>
            <div className="font-mono text-xs text-muted" dir="ltr">
              {phone}
            </div>
          </div>
          {r.panel && (
            <Link href={r.panel} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 hover:bg-canvas">
              <LayoutDashboard className="h-4 w-4 text-brand" /> {r.panelLabel}
            </Link>
          )}
          <Link href="/garage" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 hover:bg-canvas">
            <Car className="h-4 w-4 text-brand" /> گاراژ من
          </Link>
          <button
            onClick={async () => {
              await fetch("/session", { method: "DELETE" });
              router.replace("/login");
              router.refresh();
            }}
            className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-brand hover:bg-brand-soft"
          >
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>
      )}
    </div>
  );
}
