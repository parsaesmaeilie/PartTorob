import Link from "next/link";
import { Suspense } from "react";
import { BellRing, Bot, ShieldCheck, TrendingDown } from "lucide-react";
import { CarArt } from "@/components/art/CarArt";
import { api } from "@/lib/api";
import { formatNumber, toPersianDigits } from "@/shared/text";
import { GroupIcon, groupTint } from "@/components/icons";
import { ProductCard } from "@/components/product";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [meta, me] = await Promise.all([api.meta(), api.meOptional()]);
  const g = me ? await api.garage() : null; // guests browse and buy without an account
  const active = g ? (g.vehicles.find((v) => v.vehicle.id === g.activeVehicleId) ?? g.vehicles[0]) : undefined;
  const nextService = active?.services[0];
  const forYou = active
    ? await api.search({ cat: nextService?.category ?? "brake-pad", car: active.model.id, limit: 4 })
    : await api.search({ cat: "brakes", any_car: true, limit: 4 });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-navy px-6 py-10 text-white md:px-12 md:py-14">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 left-4 hidden w-[38%] max-w-xl md:block lg:bottom-10 lg:w-[42%]">
          <div className="absolute inset-x-6 bottom-3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          {[28, 44, 60].map((y, i) => (
            <span key={y} className="absolute h-0.5 rounded-full bg-white/20" style={{ top: `${y}%`, right: `-${12 + i * 6}%`, width: `${18 - i * 4}%` }} />
          ))}
          <CarArt type="sport" color="#e3262f" className="relative w-full drop-shadow-[0_20px_30px_rgba(227,38,47,.35)]" />
        </div>
        <div className="relative max-w-2xl md:max-w-[58%]">
          <span className="chip bg-white/10 text-white/80">مقایسه قیمت از {toPersianDigits(15)} فروشگاه · به‌روز</span>
          <h1 className="mt-4 text-3xl font-black leading-snug md:text-5xl">
            <span className="text-brand">قطعه ترب</span>
            <br />
            همه‌چیز برای ماشینت، یک‌جا
          </h1>
          <p className="mt-3 text-white/70">قطعه مناسب خودروی خودت را پیدا کن، قیمت همه فروشنده‌ها را مقایسه کن و بدون نگرانی از ناسازگاری بخر.</p>
          <div className="mt-6 text-ink">
            <Suspense>
              <SearchBox big />
            </Suspense>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {["روغن موتور برای ۲۰۶ تیپ ۵", "لنت جلو ارزان سمند", "باتری اصل دنا پلاس", "شمع هایما"].map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="chip bg-white/10 text-white hover:bg-white/20">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* USP */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { Icon: ShieldCheck, t: "تضمین سازگاری", d: "بر اساس دفترچه خودرو" },
          { Icon: TrendingDown, t: "تاریخچه قیمت", d: "بهترین زمان خرید" },
          { Icon: BellRing, t: "یادآوری سرویس", d: "بر اساس کیلومتر و زمان" },
          { Icon: Bot, t: "دستیار هوشمند", d: "بپرس، پیدا کن" },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="card flex items-center gap-3 p-4">
            <Icon className="h-8 w-8 shrink-0 text-brand" strokeWidth={1.5} />
            <div>
              <div className="text-sm font-bold">{t}</div>
              <div className="text-xs text-muted">{d}</div>
            </div>
          </div>
        ))}
      </section>

      {/* GARAGE STRIP */}
      {active && (
        <section className="card flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-28 items-end justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-200 px-1">
              <CarArt type={active.model.bodyType} color={active.vehicle.color} className="w-full" />
            </div>
            <div>
              <div className="text-xs text-muted">خودروی فعال شما</div>
              <div className="font-bold">{active.title}</div>
              <div className="text-xs text-muted">{formatNumber(active.vehicle.odometerKm)} کیلومتر</div>
            </div>
          </div>
          {nextService && (
            <div className={`flex-1 rounded-2xl p-4 text-sm ${nextService.status === "ok" ? "bg-emerald-50" : "bg-brand-soft"}`}>
              <b>{nextService.title}</b>{" "}
              {nextService.remainingKm > 0 ? `— ${formatNumber(nextService.remainingKm)} کیلومتر دیگر` : `— ${formatNumber(-nextService.remainingKm)} کیلومتر گذشته!`}
            </div>
          )}
          <Link href="/garage" className="btn-ghost">
            گاراژ من ({toPersianDigits(g!.vehicles.length)} خودرو)
          </Link>
        </section>
      )}

      {/* CATEGORIES */}
      <section>
        <h2 className="mb-3 text-lg font-bold">دسته‌بندی قطعات</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {meta.groups.map((c) => (
            <Link key={c.id} href={`/search?cat=${c.id}`} className="card flex items-center gap-3 p-4 transition hover:border-brand">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${groupTint(c.id)}`}>
                <GroupIcon group={c.id} className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-sm font-bold">{c.title}</span>
                <span className="line-clamp-1 text-[11px] text-muted">{c.subtitle}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FOR YOUR CAR */}
      {forYou && forYou.results.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{active ? `پیشنهاد برای ${active.title} · ${nextService?.title}` : "پرطرفدارترین قطعات ترمز"}</h2>
            <Link href={active ? `/search?cat=${nextService?.category}` : "/search?cat=brakes&any=1"} className="text-sm text-brand">
              همه
            </Link>
          </div>
          {!me && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-navy-soft p-3 text-sm text-navy">
              بدون ثبت‌نام جست‌وجو کنید و بخرید؛ برای تضمین سازگاری و یادآوری سرویس، خودرویتان را در گاراژ ثبت کنید.
              <Link href="/signup" className="btn-primary py-1.5 text-xs">
                ساخت گاراژ من
              </Link>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {forYou.results.map((r, i) => (
              <ProductCard key={r.product.id} r={r} rank={i} showFit={!!active} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
