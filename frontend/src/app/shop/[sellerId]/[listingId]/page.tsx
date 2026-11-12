import Link from "next/link";
import { ArrowRight, Info, ShieldCheck, Store, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { formatToman, toPersianDigits } from "@/shared/text";
import { ProductArt } from "@/components/icons";
import { productLabel } from "@/components/art/PartArt";

export const dynamic = "force-dynamic";

/**
 * DEMO STOREFRONT — stands in for the seller's real website (the simulated
 * shops have no site of their own). With real crawlers the click-out goes
 * straight to the shop's product page and this route is never used.
 */
export default async function DemoShop({ params, searchParams }: { params: Promise<{ sellerId: string; listingId: string }>; searchParams: Promise<{ p?: string }> }) {
  const { sellerId } = await params;
  const { p: productId } = await searchParams;
  const d = productId ? await api.product(productId) : null;
  const offer = d?.product.offers.find((o) => o.sellerId === sellerId);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          این صفحهٔ <b>شبیه‌سازی‌شدهٔ فروشگاه</b> است. در نسخهٔ واقعی، کاربر با همین کلیک مستقیم به صفحهٔ محصول در سایت فروشنده می‌رود و خرید را همان‌جا
          انجام می‌دهد. کلیک شما در «قطعه ترب» ثبت شد.
        </span>
      </div>

      {d && offer ? (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-navy px-5 py-3 text-white">
            <Store className="h-5 w-5" />
            <b>{offer.sellerName}</b>
            <span className="mr-auto text-xs text-white/60">فروشگاه اینترنتی لوازم یدکی</span>
          </div>
          <div className="grid gap-5 p-5 md:grid-cols-[240px_1fr]">
            <ProductArt category={d.product.category} group={d.product.group} label={productLabel(d.product)} variant={d.product.brand} size="lg" />
            <div className="space-y-3">
              <h1 className="text-lg font-black leading-8">{offer.rawTitle}</h1>
              <div className="text-2xl font-black text-brand">{formatToman(offer.priceToman)}</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="chip bg-canvas">
                  <Truck className="h-3.5 w-3.5" /> {offer.shippingDays === 0 ? "ارسال امروز" : `ارسال ${toPersianDigits(offer.shippingDays)} روزه`}
                </span>
                {offer.warrantyMonths > 0 && (
                  <span className="chip bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> {toPersianDigits(offer.warrantyMonths)} ماه گارانتی
                  </span>
                )}
                <span className={`chip ${offer.inStock ? "bg-emerald-50 text-emerald-700" : "bg-brand-soft text-brand"}`}>{offer.inStock ? "موجود" : "ناموجود"}</span>
              </div>
              <button className="btn-primary w-full" disabled>
                افزودن به سبد این فروشگاه (شبیه‌سازی)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-10 text-center text-muted">این آگهی دیگر در فروشگاه موجود نیست.</div>
      )}

      {d && (
        <Link href={`/product/${d.product.id}`} className="inline-flex items-center gap-1 text-sm text-brand">
          <ArrowRight className="h-4 w-4" /> بازگشت به مقایسهٔ قیمت در قطعه ترب
        </Link>
      )}
    </div>
  );
}
