"use client";

import { Bot, Car, GitCompareArrows, House, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "خانه", icon: House },
  { href: "/search", label: "دسته‌ها", icon: LayoutGrid },
  { href: "/assistant", label: "دستیار", icon: Bot },
  { href: "/garage", label: "گاراژ", icon: Car },
  { href: "/compare", label: "مقایسه", icon: GitCompareArrows },
];

export function MobileNav() {
  const path = usePathname();
  if (path === "/login" || path === "/signup") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${on ? "text-brand" : "text-muted"}`}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
