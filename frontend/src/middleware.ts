import { NextResponse, type NextRequest } from "next/server";

/**
 * Guests can browse, compare and buy (click-out) without an account.
 * Personal areas (garage, assistant, seller / admin panels) need a session.
 */
const PUBLIC_PAGES = ["/search", "/product", "/compare", "/go", "/shop", "/login", "/signup", "/session"];
const PUBLIC_API = ["/api/auth/otp", "/api/search", "/api/products", "/api/meta"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return [...PUBLIC_PAGES, ...PUBLIC_API].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname) || req.cookies.get("tm_session")) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ detail: "لطفاً وارد حساب کاربری شوید" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next|favicon.ico|.*\\.svg$).*)"] };
