import Link from "next/link";
import { ArrowLeft, Database, Filter, GitMerge, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { toPersianDigits } from "@/shared/text";

export const dynamic = "force-dynamic";

/** Transparency page for the demo: what the crawl → normalize → match pipeline did. */
export default async function DataPage() {
  const r = await api.ingestion();
  const stats = [
    { Icon: Globe, label: "آگهی خام از فروشگاه‌ها", value: r.rawCount },
    { Icon: Filter, label: "نرمال‌سازی موفق", value: r.normalizedCount },
    { Icon: GitMerge, label: "محصول یکتا پس از تطبیق", value: r.productCount },
    { Icon: Database, label: "ردشده / نیازمند بازبینی", value: r.rejected.length + r.lowConfidence },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black">موتور داده: خزش ← نرمال‌سازی ← تطبیق</h1>
        <p className="text-sm text-muted">
          آخرین اجرا {new Date(r.ranAt).toLocaleString("fa-IR")} · {toPersianDigits(r.durationMs)} میلی‌ثانیه
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ Icon, label, value }) => (
          <div key={label} className="card p-4">
            <Icon className="h-5 w-5 text-brand" />
            <div className="mt-2 text-2xl font-black">{toPersianDigits(value)}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">منابع</h2>
        <div className="flex flex-wrap gap-2">
          {r.sources.map((s) => (
            <span key={s.id} className="chip bg-navy-soft text-navy">
              {s.name}: {toPersianDigits(s.fetched)} آگهی
            </span>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">نمونه نرمال‌سازی (داده کثیف ← محصول استاندارد)</h2>
        <ul className="space-y-2 text-sm">
          {r.samples.map((s) => (
            <li key={s.productId} className="flex flex-col gap-1 rounded-xl bg-canvas p-3 md:flex-row md:items-center md:gap-3">
              <code className="flex-1 text-xs text-muted">{s.before}</code>
              <ArrowLeft className="hidden h-4 w-4 shrink-0 text-brand md:block" />
              <Link href={`/product/${s.productId}`} className="flex-1 font-semibold hover:text-brand">
                {s.after}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">ردشده‌ها</h2>
        <ul className="space-y-1 text-xs">
          {r.rejected.map((x) => (
            <li key={x.raw.externalId} className="flex justify-between gap-3 border-b border-line py-1.5 last:border-0">
              <span>
                {x.raw.title} <span className="text-muted">({x.raw.sellerName})</span>
              </span>
              <span className="text-brand">{x.reason}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
