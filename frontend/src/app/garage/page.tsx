import Link from "next/link";
import { BellRing, CheckCircle2, ShoppingBag, Wallet, Wrench } from "lucide-react";
import { BODY_TYPE_FA, CarArt } from "@/components/art/CarArt";
import { api } from "@/lib/api";
import { formatNumber, formatToman, toPersianDigits } from "@/shared/text";
import { AddVehicleForm, LogServiceButton, OdometerForm, VehicleActions } from "@/components/garage-forms";
import { BuyButton } from "@/components/actions";

export const dynamic = "force-dynamic";

const STATUS = {
  ok: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", label: "به‌موقع" },
  soon: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700", label: "نزدیک" },
  overdue: { bar: "bg-brand", chip: "bg-brand-soft text-brand", label: "گذشته" },
};

export default async function GaragePage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const [g, meta] = await Promise.all([api.garage(v), api.meta()]);
  const sel = g.vehicles.find((x) => x.vehicle.id === g.selectedVehicleId);
  const serviceTitle = new Map(sel?.services.map((s) => [s.serviceId, s.title]));

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-navy text-xl font-black text-white">{g.name[0]}</div>
        <div className="flex-1">
          <h1 className="text-xl font-black">گاراژ من</h1>
          <p className="text-sm text-muted">
            {g.name} · {toPersianDigits(g.vehicles.length)} از {toPersianDigits(g.maxVehicles)} خودرو
          </p>
        </div>
        <div className="flex gap-3 text-center text-xs">
          <div className="rounded-2xl bg-brand-soft px-4 py-2">
            <div className="text-lg font-black text-brand">{toPersianDigits(g.vehicles.reduce((s, x) => s + x.due, 0))}</div>
            سرویس پیش‌رو
          </div>
          <div className="rounded-2xl bg-navy-soft px-4 py-2">
            <div className="text-lg font-black text-navy">{toPersianDigits((g.vehicles.reduce((s, x) => s + x.totalCost, 0) / 1_000_000).toFixed(1))}M</div>
            هزینه نگهداری
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {g.vehicles.map((x) => {
          const on = x.vehicle.id === sel?.vehicle.id;
          const active = x.vehicle.id === g.activeVehicleId;
          return (
            <div key={x.vehicle.id} className={`card group relative p-4 ${on ? "border-brand ring-2 ring-brand/15" : ""}`}>
              {active && <CheckCircle2 className="absolute left-3 top-3 h-5 w-5 fill-emerald-500 text-white" />}
              <Link href={`/garage?v=${x.vehicle.id}`} className="block">
                <div className="relative mb-3 flex h-28 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-100 to-slate-200 px-2 pb-1">
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-slate-300/60" />
                  <span className="chip absolute right-2 top-2 z-10 bg-white/90 text-[10px] text-muted shadow-sm">{BODY_TYPE_FA[x.model.bodyType]}</span>
                  <CarArt type={x.model.bodyType} color={x.vehicle.color} className="relative w-full transition duration-300 group-hover:-translate-x-1" />
                </div>
                <div className="font-bold">{x.title}</div>
                <div className="text-xs text-muted">
                  {toPersianDigits(x.vehicle.year)} · {formatNumber(x.vehicle.odometerKm)} کیلومتر
                </div>
                {x.due > 0 && <span className="chip mt-2 bg-brand-soft text-brand">{toPersianDigits(x.due)} سرویس نزدیک</span>}
              </Link>
              <div className="mt-2">
                <VehicleActions vehicleId={x.vehicle.id} active={active} />
              </div>
            </div>
          );
        })}
        {g.vehicles.length < g.maxVehicles && <AddVehicleForm models={meta.vehicles} />}
      </div>

      {sel && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CarArt type={sel.model.bodyType} color={sel.vehicle.color} className="hidden w-28 sm:block" />
                <div>
                <h2 className="flex items-center gap-2 font-bold">
                  <BellRing className="h-5 w-5 text-brand" /> سرویس‌های دوره‌ای {sel.title}
                </h2>
                <p className="text-xs text-muted">زمان‌بندی بر اساس دفترچه همین خودرو ({sel.model.engine})</p>
                </div>
              </div>
              <OdometerForm key={sel.vehicle.odometerKm} vehicleId={sel.vehicle.id} current={sel.vehicle.odometerKm} />
            </div>
            <ul className="divide-y divide-line">
              {sel.services.map((s) => {
                const st = STATUS[s.status];
                return (
                  <li key={s.serviceId} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-44 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {s.title} <span className={`chip ${st.chip}`}>{st.label}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        هر {formatNumber(s.intervalKm)} کیلومتر یا {toPersianDigits(s.intervalMonths)} ماه · آخرین بار {formatNumber(s.lastKm)} کیلومتر{s.estimated && " (تخمینی)"}
                      </div>
                      <div className="mt-2 h-1.5 w-full max-w-sm rounded-full bg-canvas">
                        <div className={`h-1.5 rounded-full ${st.bar}`} style={{ width: `${Math.min(100, s.progress * 100)}%` }} />
                      </div>
                    </div>
                    <div className="w-36 text-xs">
                      {s.remainingKm > 0 ? `${formatNumber(s.remainingKm)} کیلومتر مانده` : <b className="text-brand">{formatNumber(-s.remainingKm)} کیلومتر گذشته</b>}
                      <div className="text-muted">{s.remainingDays > 0 ? `${toPersianDigits(s.remainingDays)} روز مانده` : `${toPersianDigits(-s.remainingDays)} روز گذشته`}</div>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/search?cat=${s.category}`} className="chip border border-line hover:border-brand">
                        <ShoppingBag className="h-3.5 w-3.5" /> قطعه
                      </Link>
                      <LogServiceButton vehicleId={sel.vehicle.id} serviceId={s.serviceId} km={sel.vehicle.odometerKm} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className="space-y-5">
            {g.needed.length > 0 && (
              <section className="card p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Wrench className="h-4 w-4 text-brand" /> قطعات موردنیاز این ماه
                </h3>
                <ul className="space-y-3">
                  {g.needed.map(({ serviceId, serviceTitle: t, result: r }) => (
                    <li key={serviceId} className="rounded-xl bg-canvas p-3 text-xs">
                      <div className="text-muted">{t}</div>
                      <Link href={`/product/${r.product.id}`} className="line-clamp-1 font-semibold hover:text-brand">
                        {r.product.title}
                      </Link>
                      <div className="mt-2 flex items-center justify-between">
                        <b>{formatToman(r.bestOffer.priceToman)}</b>
                        <BuyButton productId={r.product.id} sellerId={r.bestOffer.sellerId} label={`خرید از ${r.bestOffer.sellerName}`} src="garage" small />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Wallet className="h-4 w-4 text-brand" /> سوابق و هزینه‌ها · {formatToman(sel.totalCost)}
              </h3>
              {sel.history.length === 0 ? (
                <p className="text-xs text-muted">هنوز سرویسی ثبت نشده.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {sel.history.slice(0, 8).map((h) => (
                    <li key={h.id} className="flex justify-between gap-2">
                      <span>
                        {serviceTitle.get(h.serviceId)}{" "}
                        <span className="text-muted">
                          · {formatNumber(h.km)} km · {new Date(h.date).toLocaleDateString("fa-IR")}
                        </span>
                      </span>
                      {h.cost ? <span className="shrink-0">{formatToman(h.cost)}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
