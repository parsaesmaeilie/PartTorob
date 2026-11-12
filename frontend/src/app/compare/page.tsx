import Link from "next/link";
import { api } from "@/lib/api";
import type { CompareResponse } from "@/lib/types";
import { formatToman, toPersianDigits } from "@/shared/text";
import { BuyButton } from "@/components/actions";
import { ProductArt } from "@/components/icons";
import { productLabel } from "@/components/art/PartArt";
import { FitBadge } from "@/components/product";

export const dynamic = "force-dynamic";

type Item = CompareResponse["items"][number];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const list = (ids ?? "").split(",").filter(Boolean);
  const data = list.length >= 2 ? await api.compare(list) : null;

  if (!data || data.items.length < 2) {
    return (
      <div className="card p-10 text-center text-muted">
        حداقل دو کالا را با دکمه «مقایسه» انتخاب کنید.{" "}
        <Link href="/search" className="text-brand">
          رفتن به محصولات
        </Link>
      </div>
    );
  }

  const items = data.items;
  const cheapest = Math.min(...items.map((i) => i.product.minPrice));
  const rows: { label: string; render: (i: Item) => React.ReactNode }[] = [
    { label: "برند", render: (i) => i.product.brandName },
    { label: "دسته", render: (i) => i.categoryTitle },
    { label: data.activeVehicleTitle ? `سازگاری با ${data.activeVehicleTitle}` : "سازگاری", render: (i) => <FitBadge fit={i.fit} compact /> },
    { label: "کمترین قیمت", render: (i) => <b className={i.product.minPrice === cheapest ? "text-emerald-700" : ""}>{formatToman(i.product.minPrice)}</b> },
    { label: "میانگین بازار", render: (i) => formatToman(i.product.avgPrice) },
    { label: "تعداد فروشنده", render: (i) => toPersianDigits(i.product.offers.length) },
    { label: "بیشترین گارانتی", render: (i) => `${toPersianDigits(Math.max(...i.product.offers.map((o) => o.warrantyMonths)))} ماه` },
    { label: "سریع‌ترین ارسال", render: (i) => `${toPersianDigits(Math.min(...i.product.offers.map((o) => o.shippingDays)))} روز` },
    { label: "روند قیمت ۳۰ روزه", render: (i) => `٪${toPersianDigits(Math.round(i.trend30d * 100))}` },
    { label: "گرانروی / کد فنی", render: (i) => i.product.attributes.viscosity ?? i.product.attributes.plugCode ?? "—" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">مقایسه محصولات</h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="w-40" />
              {items.map(({ product: p }) => (
                <th key={p.id} className="p-4 align-top font-normal">
                  <ProductArt category={p.category} group={p.group} label={productLabel(p)} variant={p.brand} />
                  <Link href={`/product/${p.id}`} className="mt-2 line-clamp-2 block text-sm font-bold hover:text-brand">
                    {p.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <td className="p-3 text-xs text-muted">{r.label}</td>
                {items.map((i) => (
                  <td key={i.product.id} className="p-3 text-center">
                    {r.render(i)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td />
              {items.map(({ product: p }) => (
                <td key={p.id} className="p-3">
                  <BuyButton productId={p.id} sellerId={(p.offers.find((o) => o.inStock) ?? p.offers[0]).sellerId} label="ارزان‌ترین فروشگاه" src="compare" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
