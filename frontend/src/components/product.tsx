import Link from "next/link";
import { CheckCircle2, CircleHelp, Globe2, XCircle } from "lucide-react";
import type { FitResult, RankedResult } from "@/lib/types";
import { formatToman, toPersianDigits } from "@/shared/text";
import { ProductArt } from "./icons";
import { productLabel } from "./art/PartArt";
import { CompareToggle } from "./CompareBar";
import { TrendChip } from "./PriceTrend";

export function FitBadge({ fit, compact = false }: { fit: FitResult; compact?: boolean }) {
  const map = {
    fits: { cls: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2, label: "سازگار با خودروی شما" },
    "no-fit": { cls: "bg-red-50 text-brand", Icon: XCircle, label: "ناسازگار" },
    universal: { cls: "bg-sky-50 text-sky-700", Icon: Globe2, label: "عمومی" },
    unknown: { cls: "bg-slate-100 text-muted", Icon: CircleHelp, label: "سازگاری نامشخص" },
  }[fit.status];
  return (
    <span className={`chip ${map.cls}`} title={fit.reason}>
      <map.Icon className="h-3.5 w-3.5" />
      {compact ? map.label : fit.reason}
    </span>
  );
}

export function ProductCard({ r, rank, showFit = true }: { r: RankedResult; rank?: number; showFit?: boolean }) {
  const p = r.product;
  return (
    <div className="card group flex flex-col overflow-hidden p-3 transition hover:shadow-lg hover:shadow-black/5">
      <Link href={`/product/${p.id}`} className="relative block">
        <ProductArt category={p.category} group={p.group} label={productLabel(p)} variant={p.brand} />
        {rank === 0 && <span className="chip absolute right-2 top-2 bg-brand text-white">بهترین انتخاب</span>}
        {r.savingVsAvg > 0.05 && (
          <span className="chip absolute left-2 top-2 bg-white/90 text-brand">٪{toPersianDigits(Math.round(r.savingVsAvg * 100))} زیر میانگین</span>
        )}
      </Link>
      <Link href={`/product/${p.id}`} className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-6 hover:text-brand">
        {p.title}
      </Link>
      {showFit && (
        <div className="mt-2">
          <FitBadge fit={r.fit} compact />
        </div>
      )}
      <ul className="mt-2 space-y-0.5 text-[11.5px] leading-5 text-muted">
        {r.reasons.slice(0, 2).map((x) => (
          <li key={x}>• {x}</li>
        ))}
      </ul>
      <div className="mt-auto pt-3">
        <TrendChip history={p.priceHistory} />
      </div>
      <div className="flex items-end justify-between pt-1">
        <div>
          <div className="text-[11px] text-muted">از {toPersianDigits(p.offers.length)} فروشنده</div>
          <div className="text-base font-bold text-ink">{formatToman(r.bestOffer.priceToman)}</div>
        </div>
        <CompareToggle id={p.id} />
      </div>
    </div>
  );
}

export function PriceChart({ history, height = 160 }: { history: { date: string; price: number }[]; height?: number }) {
  const w = 600;
  const h = height;
  const pad = 24;
  const prices = history.map((x) => x.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const x = (i: number) => pad + (i / (history.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
  const d = history.map((pt, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pt.price).toFixed(1)}`).join(" ");
  const area = `${d} L${x(history.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="نمودار تغییر قیمت">
      <defs>
        <linearGradient id="pc" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e3262f" stopOpacity="0.18" />
          <stop offset="1" stopColor="#e3262f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad} x2={w - pad} y1={pad + t * (h - pad * 2)} y2={pad + t * (h - pad * 2)} stroke="#e7e9ef" />
          <text x={w - 2} y={pad + t * (h - pad * 2) + 4} fontSize="10" fill="#6b7385" textAnchor="end">
            {toPersianDigits(Math.round((hi - t * (hi - lo)) / 1000).toLocaleString("en-US"))}k
          </text>
        </g>
      ))}
      <path d={area} fill="url(#pc)" />
      <path d={d} fill="none" stroke="#e3262f" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(history.length - 1)} cy={y(prices.at(-1)!)} r="4" fill="#e3262f" />
    </svg>
  );
}
