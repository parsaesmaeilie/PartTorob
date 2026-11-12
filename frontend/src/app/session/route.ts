/**
 * Session endpoint of the BFF.
 *   POST   { mode: "login" | "signup", ... } → FastAPI /auth/login|signup → httpOnly cookie
 *   DELETE                                 → FastAPI /auth/logout → cookie cleared
 * The token never reaches browser JavaScript.
 */
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/lib/api";
import { SESSION_COOKIE, authHeaders } from "@/lib/session";

export async function POST(req: Request) {
  const { mode, ...body } = (await req.json()) as { mode: "login" | "signup" } & Record<string, unknown>;
  const res = await fetch(`${BACKEND_URL}/auth/${mode === "signup" ? "signup" : "login"}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return Response.json({ detail: "سرور در دسترس نیست" }, { status: 502 });
  const j = await res.json();
  if (!res.ok) return Response.json(j, { status: res.status });
  (await cookies()).set(SESSION_COOKIE, j.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return Response.json({ role: j.role, status: j.status, name: j.name });
}

export async function DELETE() {
  await fetch(`${BACKEND_URL}/auth/logout`, { method: "POST", headers: await authHeaders() }).catch(() => null);
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
