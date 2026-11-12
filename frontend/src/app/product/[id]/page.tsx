import Link from "next/link";
import { Star, Truck, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { formatToman, toPersianDigits } from "@/shared/text";
import { BuyButton } from "@/components/actions";
import { CompareToggle } from "@/components/CompareBar";
import { ProductArt } from "@/components/icons";
import { productLabel } from "@/components/art/PartArt";
import { FitBadge, PriceChart } from "@/components/product";
import { DailyPriceTrend } from "@/components/PriceTrend";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, meta] = await Promise.all([api.product(id), api.meta()]);
  const p = d.product;
  const trend = d.trend30d;
  const prices = p.priceHistory.map((h) => h.price);
  const best = p.offers.find((o) => o.inStock) ?? p.offers[0];
  const group = meta.groups.find((g) => g.id === p.group);
  const a = p.attributes;

  const attrs: [string, string | null | undefined][] = [
    ["برند", p.brandName],
    ["دسته", d.categoryTitle],
    ["موقعیت", a.position === "front" ? "جلو" : a.position === "rear" ? "عقب" : null],
    ["گرانروی", a.viscosity],
    ["حجم", a.volumeL ? `${toPersianDigits(a.volumeL)} لیتر` : null],
    ["آمپر", a.ampere ? toPersianDigits(a.ampere) : null],
    ["کد فنی", a.plugCode],
    ["سری", a.line],
  ];

  return (
    <div className="space-y-5">
      <nav className="text-xs text-muted">
        <Link href="/">خانه</Link> / <Link href={`/search?cat=${p.group}`}>{group?.title}</Link> / {d.categoryTitle}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="card grid gap-5 p-5 md:grid-cols-[300px_1fr]">
          <ProductArt category={p.category} group={p.group} size="lg" label={productLabel(p)} variant={p.brand} />
          <div className="space-y-3">
            <h1 className="text-xl font-black leading-9">{p.title}</h1>
            <FitBadge fit={d.fit} />
            <table className="w-full text-sm">
              <tbody>
                {attrs
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k} className="border-b border-line last:border-0">
                      <td className="py-2 text-muted">{k}</td>
                      <td className="py-2 font-medium">{v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {d.garageFits.length > 0 && (
              <div className="rounded-xl bg-canvas p-3">
                <div className="mb-2 text-xs font-bold">سازگاری با خودروهای گاراژ شما</div>
                <div className="flex flex-wrap gap-2">
                  {d.garageFits.map((v) => (
                    <span key={v.vehicleId} className="flex items-center gap-1 text-xs">
                      {v.title}: <FitBadge fit={v.fit} compact />
                    </span>
                  ))}
                </div>
              </div>
            )}
            <CompareToggle id={p.id} />
          </div>
        </div>

        <aside className="card space-y-3 p-5">
          <div className="text-xs text-muted">کمترین قیمت از {toPersianDigits(p.offers.length)} فروشنده</div>
          <div className="text-2xl font-black">{formatToman(best.priceToman)}</div>
          <div className="text-xs text-muted">میانگین بازار: {formatToman(p.avgPrice)}</div>
          <div className={`rounded-xl p-3 text-xs ${trend < 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {trend < 0
              ? `قیمت در ۳۰ روز اخیر ${toPersianDigits(Math.round(-trend * 100))}٪ کاهش داشته — زمان خوبی برای خرید است.`
              : `قیمت در ۳۰ روز اخیر ${toPersianDigits(Math.round(trend * 100))}٪ افزایش داشته؛ روند بازار صعودی است.`}
          </div>
          <BuyButton productId={p.id} sellerId={best.sellerId} label={`خرید از ${best.sellerName}`} src="product-buybox" disabled={!best.inStock} />
          <p className="text-center text-[11px] text-muted">پرداخت و ارسال در سایت خود فروشگاه انجام می‌شود.</p>
        </aside>
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line p-4 font-bold">
          خرید از {toPersianDigits(p.offers.length)} فروشگاه <span className="text-xs font-normal text-muted">· مرتب‌شده بر اساس قیمت</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-canvas text-xs text-muted">
              <tr>
                <th className="p-3 text-right">فروشنده</th>
                <th className="p-3 text-right">عنوان در فروشگاه (داده خام)</th>
                <th className="p-3">ارسال</th>
                <th className="p-3">گارانتی</th>
                <th className="p-3">قیمت</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {p.offers.map((o) => (
                <tr key={o.sellerId} className={`border-t border-line ${o.inStock ? "" : "opacity-50"}`}>
                  <td className="p-3">
                    <div className="font-semibold">{o.sellerName}</div>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {toPersianDigits((o.sellerTrust * 5).toFixed(1))}
                    </div>
                  </td>
                  <td className="max-w-64 p-3 text-xs text-muted">{o.rawTitle}</td>
                  <td className="p-3 text-center text-xs">
                    <Truck className="mx-auto mb-0.5 h-4 w-4 text-muted" />
                    {o.shippingDays === 0 ? "امروز" : `${toPersianDigits(o.shippingDays)} روزه`}
                  </td>
                  <td className="p-3 text-center text-xs">
                    {o.warrantyMonths ? (
                      <>
                        <ShieldCheck className="mx-auto mb-0.5 h-4 w-4 text-emerald-600" />
                        {toPersianDigits(o.warrantyMonths)} ماه
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-center font-bold">{formatToman(o.priceToman)}</td>
                  <td className="p-3"><BuyButton productId={p.id} sellerId={o.sellerId} label="خرید" src="product-offers" small disabled={!o.inStock} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">تاریخچه قیمت (۱۲۰ روز)</h2>
          <div className="flex gap-3 text-xs text-muted">
            <span>کمترین: {formatToman(Math.min(...prices))}</span>
            <span>بیشترین: {formatToman(Math.max(...prices))}</span>
          </div>
        </div>
        <PriceChart history={p.priceHistory} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-bold">روند قیمت روزانه</h2>
        <p className="mb-4 text-xs text-muted">کمترین قیمت بازار هر روز و اینکه نسبت به روز قبل چقدر گران یا ارزان شده.</p>
        <DailyPriceTrend history={p.priceHistory} />
      </section>

      {d.similar.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">گزینه‌های مشابه</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {d.similar.map((r) => (
              <Link key={r.product.id} href={`/product/${r.product.id}`} className="card flex items-center gap-3 p-3 hover:border-brand">
                <ProductArt category={r.product.category} group={r.product.group} size="sm" />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-xs font-semibold">{r.product.title}</span>
                  <span className="text-xs text-muted">{formatToman(r.bestOffer.priceToman)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
