import { BellRing, ShieldCheck, TrendingDown } from "lucide-react";
import { TireChange } from "../art/TireChange";

/** Split-screen frame for login / signup: brand story on one side, form on the other. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-black/5 md:grid-cols-2">
      <div className="p-6 md:p-10">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white md:flex">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative">
          <div className="text-3xl font-black text-brand">قطعه ترب</div>
          <div className="mt-1 text-white/70">همه‌چیز برای ماشینت، یک‌جا</div>
        </div>
        <div className="relative space-y-3 text-sm">
          {[
            { Icon: TrendingDown, t: "قیمت همه فروشگاه‌ها در یک نگاه" },
            { Icon: ShieldCheck, t: "تضمین سازگاری قطعه با خودروی شما" },
            { Icon: BellRing, t: "یادآوری سرویس بر اساس دفترچه خودرو" },
          ].map(({ Icon, t }) => (
            <div key={t} className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
                <Icon className="h-4 w-4" />
              </span>
              {t}
            </div>
          ))}
        </div>
        <div className="relative">
          <TireChange className="w-full drop-shadow-[0_20px_30px_rgba(227,38,47,.35)]" />
          <p className="mt-1 text-center text-xs text-white/50">قطعه درست، برای ماشین درست</p>
        </div>
      </div>
    </div>
  );
}
