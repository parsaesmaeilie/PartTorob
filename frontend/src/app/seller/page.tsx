import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Crown, MousePointerClick, Package, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { formatToman, toPersianDigits } from "@/shared/text";
import { ProductArt } from "@/components/icons";
import { DailyBars, PanelTitle, Stat } from "@/components/panel";
import { PriceEditor } from "./PriceEditor";

export const dynamic = "force-dynamic";

export default async function SellerPanel() {
  const me = await api.me();
  if (me.role !== "seller") redirect("/");
  const d = await api.sellerDashboard();
  const pending = d.status !== "active";
  const share = d.listings.length ? Math.round((d.cheapestCount / d.listings.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <PanelTitle title={`پنل فروشنده · ${d.shopName}`} subtitle="رقابت قیمتی محصولاتتان را ببینید، قیمت و موجودی را به‌روز کنید و کلیک‌های ورودی را دنبال کنید.">
        {d.shopWebsite && (
          <a href={d.shopWebsite} target="_blank" rel="noopener noreferrer" className="chip bg-navy-soft text-navy" dir="ltr">
            {d.shopWebsite.replace(/^https?:\/\//, "")}
          </a>
        )}
        {d.trust !== null && <span className="chip bg-amber-50 text-amber-700">امتیاز فروشگاه: {toPersianDigits((d.trust * 5).toFixed(1))} از ۵</span>}
      </PanelTitle>

      {pending && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <b>فروشگاه شما در انتظار تأیید ادمین است.</b>
            <br />
            پس از تأیید، می‌توانید فید محصولات را متصل کنید و قیمت‌ها را ویرایش کنید.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat Icon={Package} label="محصول فعال در قطعه ترب" value={d.listings.length} tone="navy" />
        <Stat Icon={Crown} label="ارزان‌ترین فروشنده" value={`${toPersianDigits(d.cheapestCount)} کالا`} hint={`٪${toPersianDigits(share)} از محصولات شما`} tone="emerald" />
        <Stat Icon={MousePointerClick} label="کلیک ارسالی به فروشگاه" value={d.totalClicks} hint="کل دوره" />
        <Stat Icon={TrendingUp} label="کلیک ۷ روز اخیر" value={d.clicks7d} tone="amber" />
      </div>

      <section className="card p-5">
        <h2 className="mb-2 font-bold">کلیک‌های روزانه (۱۴ روز)</h2>
        <DailyBars data={d.daily} />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
          <h2 className="font-bold">محصولات و قیمت‌ها</h2>
          <span className="text-xs text-muted">قیمتی که اینجا ثبت کنید، بلافاصله در نتایج جست‌وجو اعمال می‌شود و بر داده خزش‌شده اولویت دارد.</span>
        </div>
        {d.listings.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">هنوز محصولی از فروشگاه شما در قطعه ترب نیست. پس از تأیید، فید محصولات (CSV / API) متصل می‌شود.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-canvas text-xs text-muted">
                <tr>
                  <th className="p-3 text-right">محصول</th>
                  <th className="p-3">جایگاه قیمتی</th>
                  <th className="p-3">کمترین قیمت بازار</th>
                  <th className="p-3">کلیک</th>
                  <th className="p-3 text-right">قیمت و موجودی شما</th>
                </tr>
              </thead>
              <tbody>
                {d.listings.map((l) => (
                  <tr key={l.productId} className="border-t border-line align-top">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <ProductArt category={l.category} group={l.group} size="sm" variant={l.brand} />
                        <div className="min-w-0">
                          <Link href={`/product/${l.productId}`} className="line-clamp-2 font-semibold hover:text-brand">
                            {l.title}
                          </Link>
                          {l.edited && <span className="chip mt-1 bg-navy-soft text-[10px] text-navy">ویرایش‌شده در پنل</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {l.isCheapest ? (
                        <span className="chip bg-emerald-50 text-emerald-700">
                          <Crown className="h-3.5 w-3.5" /> ارزان‌ترین
                        </span>
                      ) : (
                        <div className="text-xs">
                          <span className="chip bg-brand-soft text-brand">
                            رتبه {toPersianDigits(l.rank)} از {toPersianDigits(l.sellers)}
                          </span>
                          {l.gapToman > 0 && <div className="mt-1 text-muted">{formatToman(l.gapToman)} گران‌تر</div>}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center text-xs">{formatToman(l.lowestPrice)}</td>
                    <td className="p-3 text-center font-bold">{toPersianDigits(l.clicks)}</td>
                    <td className="p-3">
                      <PriceEditor productId={l.productId} price={l.myPrice} inStock={l.inStock} suggested={l.suggestedPrice} disabled={pending} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
