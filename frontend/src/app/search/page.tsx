import Link from "next/link";
import { Camera, Car, Globe2, SlidersHorizontal, Sparkles, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { formatToman, toPersianDigits } from "@/shared/text";
import { ProductCard } from "@/components/product";

export const dynamic = "force-dynamic";

const PRIORITY_FA: Record<string, string> = { balanced: "متعادل", cheap: "ارزان", quality: "کیفیت و اصالت", fast: "ارسال سریع", warranty: "گارانتی" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const cat = sp.cat;
  const showAll = sp.all === "1";
  const anyCar = sp.any === "1";
  const brand = sp.brand;
  const [meta, res] = await Promise.all([api.meta(), api.search({ q, cat, all: showAll, any_car: anyCar, brand })]);
  const prios = res.intent.priorities.length ? res.intent.priorities : (["balanced"] as const);
  const prioLabel = prios.map((p) => PRIORITY_FA[p]).join(" + ");

  const catTitle = new Map(meta.categories.map((c) => [c.id, c.title]));
  const brandName = new Map(meta.brands.map((b) => [b.id, b.name]));
  const heading = q || (cat ? (meta.groups.find((g) => g.id === cat)?.title ?? catTitle.get(cat)) : "همه قطعات");
  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(cat && { cat }), ...(showAll && { all: "1" }), ...(anyCar && { any: "1" }), ...(brand && { brand }) });
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return p.toString();
  };
  // a car typed into the query ("لنت سمند") wins over the toggle
  const carInQuery = res.intent.vehicleIds.length > 0;
  const maxW = Math.max(...res.weights.map((w) => w.weight));

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <SlidersHorizontal className="h-4 w-4" /> دسته‌بندی
          </div>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href={`/search?${qs({ cat: null, brand: null })}`} className={`block rounded-lg px-2 py-1.5 ${!cat ? "bg-brand-soft font-bold text-brand" : "hover:bg-canvas"}`}>
                همه دسته‌ها
              </Link>
            </li>
            {meta.groups.map((g) => (
              <li key={g.id}>
                <Link href={`/search?${qs({ cat: g.id, brand: null })}`} className={`block rounded-lg px-2 py-1.5 ${cat === g.id ? "bg-brand-soft font-bold text-brand" : "hover:bg-canvas"}`}>
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
          {q && cat && <p className="mt-2 text-[11px] text-muted">جست‌وجوی «{q}» داخل همین دسته انجام شده.</p>}
        </div>

        {res.brandFacets.length > 1 && (
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Tag className="h-4 w-4" /> برند
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
              <li>
                <Link href={`/search?${qs({ brand: null })}`} className={`flex justify-between rounded-lg px-2 py-1.5 ${!brand ? "bg-brand-soft font-bold text-brand" : "hover:bg-canvas"}`}>
                  همه برندها
                  <span className="text-xs text-muted">{toPersianDigits(res.brandFacets.reduce((a, f) => a + f.count, 0))}</span>
                </Link>
              </li>
              {res.brandFacets.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/search?${qs({ brand: brand === f.id ? null : f.id })}`}
                    className={`flex justify-between rounded-lg px-2 py-1.5 ${brand === f.id ? "bg-brand-soft font-bold text-brand" : "hover:bg-canvas"}`}
                  >
                    {f.name}
                    <span className="text-xs text-muted">{toPersianDigits(f.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card hidden p-4 lg:block">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-brand" /> رتبه‌بندی شفاف
          </div>
          <p className="mb-3 text-[11px] text-muted">وزن هر عامل در رتبه‌بندی این جست‌وجو (اولویت: {prioLabel})</p>
          <ul className="space-y-2">
            {res.weights.map((w) => (
              <li key={w.key} className="text-xs">
                <div className="mb-1 flex justify-between">
                  <span>{w.label}</span>
                  <span className="text-muted">٪{toPersianDigits(Math.round(w.weight * 100))}</span>
                </div>
                <div className="h-1.5 rounded-full bg-canvas">
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(w.weight / maxW) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-lg font-bold">{heading}</h1>
            {res.activeVehicleTitle && (
              <div role="radiogroup" aria-label="محدوده جست‌وجو" className={`flex rounded-xl bg-canvas p-1 text-xs ${carInQuery ? "opacity-50" : ""}`}>
                <Link
                  role="radio"
                  aria-checked={!anyCar}
                  href={`/search?${qs({ any: null })}`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${!anyCar ? "bg-white font-bold text-brand shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  <Car className="h-4 w-4" /> فقط برای {res.activeVehicleTitle}
                </Link>
                <Link
                  role="radio"
                  aria-checked={anyCar}
                  href={`/search?${qs({ any: "1", all: null })}`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${anyCar ? "bg-white font-bold text-navy shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  <Globe2 className="h-4 w-4" /> همه خودروها
                </Link>
              </div>
            )}
          </div>
          {carInQuery && res.activeVehicleTitle && <p className="mt-1 text-[11px] text-muted">خودرو در متن جست‌وجو آمده؛ همان ملاک است.</p>}
          {sp.via === "image" && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Camera className="h-3.5 w-3.5" /> از روی عکس تشخیص دادیم: {sp.note}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">برداشت ما از جست‌وجو:</span>
            {res.intent.categories.map((c) => (
              <span key={c} className="chip bg-navy-soft text-navy">
                دسته: {catTitle.get(c)}
              </span>
            ))}
            {res.vehicleTitle && (
              <span className="chip bg-emerald-50 text-emerald-700">
                خودرو: {res.vehicleTitle}
                {!res.intent.vehicleIds.length && " (گاراژ)"}
              </span>
            )}
            {res.intent.brand && <span className="chip bg-navy-soft text-navy">برند: {brandName.get(res.intent.brand)}</span>}
            {res.intent.viscosity && <span className="chip bg-navy-soft text-navy">گرانروی: {res.intent.viscosity}</span>}
            {res.intent.position && <span className="chip bg-navy-soft text-navy">{res.intent.position === "front" ? "جلو" : "عقب"}</span>}
            {res.intent.maxPrice && <span className="chip bg-navy-soft text-navy">تا {formatToman(res.intent.maxPrice)}</span>}
            {prios.map((p) => (
              <span key={p} className="chip bg-brand-soft text-brand">
                اولویت: {PRIORITY_FA[p]}
              </span>
            ))}
            {brand && (
              <Link href={`/search?${qs({ brand: null })}`} className="chip bg-navy text-white">
                برند: {res.brandFacets.find((f) => f.id === brand)?.name ?? brand} ✕
              </Link>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{toPersianDigits(res.results.length)} کالا</span>
            {res.vehicleId && (
              <Link href={`/search?${qs({ all: showAll ? null : "1" })}`} className="text-brand">
                {showAll ? "فقط قطعات سازگار" : "نمایش قطعات ناسازگار هم"}
              </Link>
            )}
          </div>
        </div>

        {res.results.length === 0 ? (
          <div className="card p-10 text-center text-muted">
            کالایی پیدا نشد.{" "}
            <Link href="/assistant" className="text-brand">
              از دستیار هوشمند بپرسید
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {res.results.map((r, i) => (
              <ProductCard key={r.product.id} r={r} rank={i} showFit={!!res.vehicleId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
