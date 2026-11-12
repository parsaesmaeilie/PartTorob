/**
 * BFF proxy: browser → /api/* (same origin, httpOnly cookie) → FastAPI /api/v1/*.
 * Adds the session as a Bearer token; streams body and status back unchanged.
 */
import { BACKEND_URL } from "@/lib/api";
import { authHeaders } from "@/lib/session";

async function proxy(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(req.url);
  const headers: Record<string, string> = await authHeaders();
  const ct = req.headers.get("content-type");
  if (ct) headers["content-type"] = ct; // keeps the multipart boundary for image upload

  try {
    const res = await fetch(`${BACKEND_URL}/${path.map(encodeURIComponent).join("/")}${url.search}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      cache: "no-store",
    });
    return new Response(res.body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
  } catch {
    return Response.json({ detail: "سرور بک‌اند در دسترس نیست (FastAPI روی پورت ۸۰۰۰)" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
