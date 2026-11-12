/**
 * Click-out: log the click in FastAPI, then 302 to the seller's page.
 * (Same pattern Torob uses — the redirect is the product's revenue event.)
 */
import { BACKEND_URL } from "@/lib/api";
import { authHeaders } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ productId: string; sellerId: string }> }) {
  const { productId, sellerId } = await params;
  const src = new URL(req.url).searchParams.get("src") ?? "";
  const res = await fetch(`${BACKEND_URL}/go/${encodeURIComponent(productId)}/${encodeURIComponent(sellerId)}?src=${encodeURIComponent(src)}`, {
    headers: await authHeaders(),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return Response.redirect(new URL(`/product/${encodeURIComponent(productId)}`, req.url), 302);
  const { url } = (await res.json()) as { url: string };
  const target = new URL(url);
  target.searchParams.set("utm_source", "qatee-torob");
  target.searchParams.set("p", productId);
  return Response.redirect(target, 302);
}
