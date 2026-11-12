/** Price-trend math on a product's daily min-price history (oldest → newest). */

export interface PricePoint {
  date: string;
  price: number;
}

export interface DailyChange {
  date: string;
  price: number;
  change: number; // vs previous day, toman
  pct: number; // vs previous day, 0.012 = +1.2%
}

export interface PriceStats {
  current: number;
  d1: number;
  d7: number;
  d30: number;
  d90: number;
  min90: number;
  max90: number;
  daily: DailyChange[]; // newest first
}

function pctSince(h: PricePoint[], days: number) {
  const then = h[Math.max(0, h.length - 1 - days)].price;
  return then ? (h[h.length - 1].price - then) / then : 0;
}

export function priceStats(h: PricePoint[], days = 14): PriceStats {
  const last90 = h.slice(-91);
  const daily = h
    .slice(-(days + 1))
    .map((p, i, a) => (i === 0 ? null : { date: p.date, price: p.price, change: p.price - a[i - 1].price, pct: (p.price - a[i - 1].price) / a[i - 1].price }))
    .filter((x): x is DailyChange => !!x)
    .reverse();
  return {
    current: h[h.length - 1].price,
    d1: pctSince(h, 1),
    d7: pctSince(h, 7),
    d30: pctSince(h, 30),
    d90: pctSince(h, 90),
    min90: Math.min(...last90.map((p) => p.price)),
    max90: Math.max(...last90.map((p) => p.price)),
    daily,
  };
}

const FA = "۰۱۲۳۴۵۶۷۸۹";
/** "+۱٫۲٪" / "−۰٫۸٪" — up is red (more expensive), down is green. */
export function formatPct(p: number, digits = 1) {
  const s = Math.abs(p * 100).toFixed(digits).replace(".", "٫").replace(/\d/g, (d) => FA[+d]);
  return `${p > 0.0005 ? "+" : p < -0.0005 ? "−" : ""}${s}٪`;
}

export function trendTone(p: number) {
  return p > 0.0005 ? "text-brand" : p < -0.0005 ? "text-emerald-700" : "text-muted";
}
