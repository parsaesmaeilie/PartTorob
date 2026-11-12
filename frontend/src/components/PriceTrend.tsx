import { TrendingDown, TrendingUp } from "lucide-react";
import { formatPct, priceStats, trendTone, type PricePoint } from "@/lib/price";
import { formatNumber, formatToman } from "@/shared/text";

/** Tiny 30-day line for product cards. */
export function Sparkline({ history, className = "h-6 w-20" }: { history: PricePoint[]; className?: string }) {
  const h = history.slice(-31);
  const lo = Math.min(...h.map((p) => p.price));
  const hi = Math.max(...h.map((p) => p.price));
  const up = h[h.length - 1].price >= h[0].price;
  const pts = h.map((p, i) => `${(i / (h.length - 1)) * 100},${24 - ((p.price - lo) / (hi - lo || 1)) * 22 - 1}`).join(" ");
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "#e3262f" : "#059669"} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Card chip: "۷ روز +۲٫۱٪" with a sparkline. */
export function TrendChip({ history }: { history: PricePoint[] }) {
  const s = priceStats(history);
  return (
    <span className="flex items-center gap-1 text-[11px]" title="تغییر کمترین قیمت در ۷ روز اخیر">
      <Sparkline history={history} className="h-4 w-12" />
      <span className="text-muted">۷ روز</span>
      <b className={trendTone(s.d7)} dir="ltr">
        {formatPct(s.d7)}
      </b>
    </span>
  );
}

/** Product page: how much it got more expensive — per day, week, month, quarter. */
export function DailyPriceTrend({ history }: { history: PricePoint[] }) {
  const s = priceStats(history, 14);
  const maxAbs = Math.max(...s.daily.map((d) => Math.abs(d.pct)), 0.001);
  const periods = [
    { label: "نسبت به دیروز", v: s.d1 },
    { label: "۷ روز اخیر", v: s.d7 },
    { label: "۳۰ روز اخیر", v: s.d30 },
    { label: "۹۰ روز اخیر", v: s.d90 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {periods.map(({ label, v }) => (
          <div key={label} className={`rounded-xl p-3 ${v > 0.0005 ? "bg-brand-soft" : v < -0.0005 ? "bg-emerald-50" : "bg-canvas"}`}>
            <div className="text-[11px] text-muted">{label}</div>
            <div className={`flex items-center gap-1 text-lg font-black ${trendTone(v)}`}>
              {v > 0.0005 ? <TrendingUp className="h-4 w-4" /> : v < -0.0005 ? <TrendingDown className="h-4 w-4" /> : null}
              <span dir="ltr">{formatPct(v)}</span>
            </div>
            <div className="text-[10px] text-muted">{v > 0.0005 ? "گران‌تر شده" : v < -0.0005 ? "ارزان‌تر شده" : "بدون تغییر"}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span>کمترین ۹۰ روز: {formatToman(s.min90)}</span>
        <span>بیشترین ۹۰ روز: {formatToman(s.max90)}</span>
        <span>قیمت امروز {s.max90 > s.min90 ? `${formatNumber(((s.current - s.min90) / (s.max90 - s.min90)) * 100)}٪ بالاتر از کف بازه` : ""}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-2 text-right">روز</th>
              <th className="py-2 text-right">کمترین قیمت</th>
              <th className="py-2 text-right">تغییر روزانه</th>
              <th className="w-1/3 py-2" />
            </tr>
          </thead>
          <tbody>
            {s.daily.map((d) => (
              <tr key={d.date} className="border-t border-line">
                <td className="py-1.5">{new Date(d.date).toLocaleDateString("fa-IR", { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="py-1.5 font-semibold">{formatToman(d.price)}</td>
                <td className={`py-1.5 font-bold ${trendTone(d.pct)}`}>
                  <span dir="ltr">{formatPct(d.pct)}</span>
                  <span className="mr-1 text-[11px] font-normal text-muted">({d.change > 0 ? "+" : d.change < 0 ? "−" : ""}{formatNumber(Math.abs(d.change))})</span>
                </td>
                <td className="py-1.5">
                  {/* diverging bar: up = red to the left, down = green to the right */}
                  <div className="relative h-2 rounded-full bg-canvas">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
                    <span
                      className={`absolute inset-y-0 rounded-full ${d.pct > 0 ? "right-1/2 bg-brand" : "left-1/2 bg-emerald-500"}`}
                      style={{ width: `${(Math.abs(d.pct) / maxAbs) * 50}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
