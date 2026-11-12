import Link from "next/link";
import { Suspense } from "react";
import { Bot, Car, LayoutDashboard } from "lucide-react";
import { api } from "@/lib/api";
import { SearchBox } from "./SearchBox";
import { CarArt } from "./art/CarArt";
import { UserMenu } from "./UserMenu";

export const BRAND = "قطعه ترب";
export const SLOGAN = "همه‌چیز برای ماشینت، یک‌جا";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
        <Car className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-black text-brand">{BRAND}</span>
        <span className="hidden text-[10px] text-muted sm:block">{SLOGAN}</span>
      </span>
    </Link>
  );
}

export async function Header() {
  const me = await api.meOptional().catch(() => undefined); // undefined = backend down, null = guest

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Logo />
        {me !== undefined && (
          <div className="hidden flex-1 md:block">
            <Suspense>
              <SearchBox />
            </Suspense>
          </div>
        )}
        <nav className="mr-auto flex items-center gap-1 md:mr-0">
          {me ? (
            <>
              {me.role !== "customer" && (
                <Link href={me.role === "admin" ? "/admin" : "/seller"} className="hidden items-center gap-1 rounded-xl bg-navy px-3 py-2 text-sm text-white hover:bg-navy/90 sm:flex">
                  <LayoutDashboard className="h-4 w-4" /> {me.role === "admin" ? "پنل مدیریت" : "پنل فروشنده"}
                </Link>
              )}
              <Link href="/garage" className="hidden items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:border-brand sm:flex">
                {me.activeVehicle ? <CarArt type={me.activeVehicle.bodyType} color={me.activeVehicle.color} className="h-5 w-12" /> : <Car className="h-4 w-4 text-brand" />}
                <span className="max-w-40 truncate">{me.activeVehicle?.title ?? "افزودن خودرو"}</span>
              </Link>
              <Link href="/assistant" className="hidden items-center gap-1 rounded-xl px-3 py-2 text-sm hover:text-brand lg:flex">
                <Bot className="h-4 w-4" /> دستیار
              </Link>
              <UserMenu name={me.name} role={me.role} phone={me.phone} />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost py-2">
                ورود
              </Link>
              <Link href="/signup" className="btn-primary py-2">
                ثبت‌نام
              </Link>
            </>
          )}
        </nav>
      </div>
      {me === undefined && <div className="bg-brand px-4 py-1.5 text-center text-xs text-white">سرور بک‌اند (FastAPI) در دسترس نیست — آن را روی پورت ۸۰۰۰ اجرا کنید.</div>}
      {me !== undefined && (
        <div className="px-4 pb-3 md:hidden">
          <Suspense>
            <SearchBox />
          </Suspense>
        </div>
      )}
    </header>
  );
}
