import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Database, MousePointerClick, Package, Store, Users } from "lucide-react";
import { api } from "@/lib/api";
import { toPersianDigits } from "@/shared/text";
import { DailyBars, PanelTitle, Stat } from "@/components/panel";
import { ReindexButton, StatusButtons } from "./AdminActions";

export const dynamic = "force-dynamic";

const STATUS = {
  active: { t: "فعال", c: "bg-emerald-50 text-emerald-700" },
  pending: { t: "در انتظار تأیید", c: "bg-amber-50 text-amber-700" },
  blocked: { t: "مسدود", c: "bg-brand-soft text-brand" },
  unclaimed: { t: "بدون مالک (خزش)", c: "bg-canvas text-muted" },
} as Record<string, { t: string; c: string }>;
const ROLE_FA: Record<string, string> = { admin: "ادمین", seller: "فروشنده", customer: "کاربر" };

export default async function AdminPanel() {
  const me = await api.me();
  if (me.role !== "admin") redirect("/");
  const o = await api.adminOverview();
  const users = Object.values(o.usersByRole).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <PanelTitle title="پنل مدیریت" subtitle="سلامت پلتفرم: کاربران، فروشگاه‌ها، کلیک‌های خروجی و کیفیت داده.">
        <ReindexButton />
      </PanelTitle>

      {o.pendingSellers > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5" /> {toPersianDigits(o.pendingSellers)} فروشگاه جدید منتظر تأیید است (جدول فروشگاه‌ها).
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          Icon={Users}
          label="کاربران"
          value={users}
          hint={`${toPersianDigits(o.usersByRole.customer ?? 0)} کاربر · ${toPersianDigits(o.usersByRole.seller ?? 0)} فروشنده · ${toPersianDigits(o.usersByRole.admin ?? 0)} ادمین`}
          tone="navy"
        />
        <Stat Icon={Store} label="فروشگاه‌ها" value={o.shops.length} hint={`${toPersianDigits(o.offers)} پیشنهاد قیمت`} tone="amber" />
        <Stat Icon={Package} label="محصول یکتا (پس از تطبیق)" value={o.products} tone="emerald" />
        <Stat Icon={MousePointerClick} label="کلیک خروجی به فروشگاه‌ها" value={o.totalClicks} hint="معیار اصلی درآمد (CPC)" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="card p-5">
          <h2 className="mb-2 font-bold">کلیک‌های خروجی روزانه</h2>
          <DailyBars data={o.daily} />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-bold">پرکلیک‌ترین محصولات</h2>
          {o.topProducts.length === 0 ? (
            <p className="text-xs text-muted">هنوز کلیکی ثبت نشده.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {o.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-canvas text-xs font-bold">{toPersianDigits(i + 1)}</span>
                  <Link href={`/product/${p.productId}`} className="line-clamp-1 flex-1 hover:text-brand">
                    {p.title}
                  </Link>
                  <b>{toPersianDigits(p.clicks)}</b>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-line p-4 font-bold">فروشگاه‌ها</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-canvas text-xs text-muted">
              <tr>
                <th className="p-3 text-right">فروشگاه</th>
                <th className="p-3">منبع</th>
                <th className="p-3">امتیاز</th>
                <th className="p-3">محصول</th>
                <th className="p-3">کلیک</th>
                <th className="p-3 text-right">مالک</th>
                <th className="p-3">وضعیت</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {o.shops.map((s) => (
                <tr key={s.sellerId} className={`border-t border-line ${s.status === "pending" ? "bg-amber-50/40" : ""}`}>
                  <td className="p-3 font-semibold">{s.name}</td>
                  <td className="p-3 text-center text-xs">{s.source === "crawled" ? "خزش‌شده" : "ثبت‌نامی"}</td>
                  <td className="p-3 text-center text-xs">{s.trust !== null ? toPersianDigits((s.trust * 5).toFixed(1)) : "—"}</td>
                  <td className="p-3 text-center">{toPersianDigits(s.listings)}</td>
                  <td className="p-3 text-center font-bold">{toPersianDigits(s.clicks)}</td>
                  <td className="p-3 text-xs">
                    {s.ownerName ? (
                      <>
                        {s.ownerName}{" "}
                        <span className="font-mono text-muted" dir="ltr">
                          {s.ownerPhone}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`chip ${STATUS[s.status]?.c}`}>{STATUS[s.status]?.t}</span>
                  </td>
                  <td className="p-3">{s.ownerId && <StatusButtons userId={s.ownerId} status={s.status} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line p-4 font-bold">کاربران اخیر</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-canvas text-xs text-muted">
                <tr>
                  <th className="p-3 text-right">نام</th>
                  <th className="p-3">موبایل</th>
                  <th className="p-3">نقش</th>
                  <th className="p-3">خودرو</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {o.users.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="p-3">
                      {u.name}
                      {u.shopName && <span className="text-xs text-muted"> · {u.shopName}</span>}
                    </td>
                    <td className="p-3 text-center font-mono text-xs" dir="ltr">
                      {u.phone}
                    </td>
                    <td className="p-3 text-center text-xs">{ROLE_FA[u.role]}</td>
                    <td className="p-3 text-center">{toPersianDigits(u.vehicles)}</td>
                    <td className="p-3 text-center">
                      <span className={`chip ${STATUS[u.status]?.c}`}>{STATUS[u.status]?.t}</span>
                    </td>
                    <td className="p-3">{u.role !== "admin" && <StatusButtons userId={u.id} status={u.status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Database className="h-4 w-4 text-brand" /> کیفیت داده
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-canvas p-2">
              <div className="text-lg font-black">{toPersianDigits(o.rawListings)}</div>
              آگهی خام
            </div>
            <div className="rounded-xl bg-canvas p-2">
              <div className="text-lg font-black text-brand">{toPersianDigits(o.rejectedListings)}</div>
              ردشده
            </div>
            <div className="rounded-xl bg-canvas p-2">
              <div className="text-lg font-black text-amber-600">{toPersianDigits(o.lowConfidence)}</div>
              نیازمند بازبینی
            </div>
          </div>
          <p className="text-xs text-muted">آخرین خزش: {new Date(o.lastCrawl).toLocaleString("fa-IR")}</p>
          <Link href="/admin/data" className="btn-ghost w-full">
            جزئیات موتور داده (نرمال‌سازی و تطبیق)
          </Link>
        </section>
      </div>
    </div>
  );
}
