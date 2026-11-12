import type { LucideIcon } from "lucide-react";
import type { DayCount } from "@/lib/types";
import { toPersianDigits } from "@/shared/text";

export function Stat({ Icon, label, value, hint, tone = "brand" }: { Icon: LucideIcon; label: string; value: string | number; hint?: string; tone?: "brand" | "navy" | "emerald" | "amber" }) {
  const t = { brand: "bg-brand-soft text-brand", navy: "bg-navy-soft text-navy", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" }[tone];
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${t}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-black">{typeof value === "number" ? toPersianDigits(value.toLocaleString("en-US")) : value}</div>
        <div className="truncate text-xs text-muted">{label}</div>
        {hint && <div className="text-[10px] text-muted">{hint}</div>}
      </div>
    </div>
  );
}

/** 14-day click-outs as bars (server-rendered SVG). */
export function DailyBars({ data, height = 120 }: { data: DayCount[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.clicks));
  const w = 28;
  const gap = 8;
  const width = data.length * (w + gap);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 -16 ${width} ${height + 40}`} className="h-40 w-full min-w-[420px]" role="img" aria-label="کلیک‌های روزانه">
        {data.map((d, i) => {
          const h = (d.clicks / max) * height;
          const x = width - (i + 1) * (w + gap) + gap / 2; // RTL: today on the left
          const isToday = i === data.length - 1;
          return (
            <g key={d.day}>
              <rect x={x} y={height - h} width={w} height={Math.max(h, 2)} rx="6" fill={isToday ? "#e3262f" : "#15213b"} opacity={isToday ? 1 : 0.25 + 0.75 * (d.clicks / max)} />
              {d.clicks > 0 && (
                <text x={x + w / 2} y={height - h - 4} textAnchor="middle" fontSize="10" fill="#1d2433">
                  {toPersianDigits(d.clicks)}
                </text>
              )}
              <text x={x + w / 2} y={height + 16} textAnchor="middle" fontSize="9" fill="#6b7385">
                {new Date(d.day).toLocaleDateString("fa-IR", { day: "numeric", month: "short" })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PanelTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
