import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { CompareBar } from "@/components/CompareBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "قطعه ترب | همه‌چیز برای ماشینت، یک‌جا",
  description: "مقایسه قیمت قطعات یدکی از همه فروشگاه‌ها، تضمین سازگاری با خودروی شما و یادآوری هوشمند سرویس‌ها",
};

export const viewport: Viewport = { themeColor: "#e3262f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* loaded by the browser (no build-time font fetch); falls back to Tahoma offline */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;900&display=swap" />
      </head>
      <body className="antialiased">
        <Header />
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-4 md:pb-12">{children}</main>
        <CompareBar />
        <MobileNav />
      </body>
    </html>
  );
}
