"use client";

import { ExternalLink } from "lucide-react";

export async function postJson(url: string, body?: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof j.detail === "string" ? j.detail : "ورودی نامعتبر است");
  return j;
}

/**
 * "Buy at seller" — no cart: we hand the user to the shop that sells it.
 * Goes through /go/… so the click-out is logged (the marketplace's revenue
 * metric) before redirecting. Opens in a new tab so the comparison stays open.
 */
export function BuyButton({
  productId,
  sellerId,
  label = "خرید از فروشگاه",
  src,
  small = false,
  disabled = false,
}: {
  productId: string;
  sellerId: string;
  label?: string;
  src: string;
  small?: boolean;
  disabled?: boolean;
}) {
  if (disabled) return <span className={`${small ? "btn-ghost px-3 py-1.5 text-xs" : "btn-ghost w-full"} cursor-not-allowed opacity-50`}>ناموجود</span>;
  return (
    <a
      href={`/go/${encodeURIComponent(productId)}/${encodeURIComponent(sellerId)}?src=${src}`}
      target="_blank"
      rel="noopener"
      className={small ? "btn-primary whitespace-nowrap px-3 py-1.5 text-xs" : "btn-primary w-full"}
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
