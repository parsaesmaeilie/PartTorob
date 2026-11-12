/**
 * Server-side API client (used by Server Components).
 * Next.js is the BFF: it owns the httpOnly session cookie and forwards it to
 * FastAPI as a Bearer token. Browsers never talk to FastAPI directly.
 */
import "server-only";
import { notFound, redirect } from "next/navigation";
import { authHeaders } from "./session";
import type { AdminOverview, CompareResponse, Garage, IngestionReport, Me, Meta, ProductDetail, SearchResponse, SellerDashboard } from "./types";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

async function get<T>(path: string, params?: Params, opts: { optional?: boolean } = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const res = await fetch(`${BACKEND_URL}${path}${qs.size ? `?${qs}` : ""}`, { headers: await authHeaders(), cache: "no-store" });
  if (res.status === 401) {
    if (opts.optional) return null as T;
    redirect("/login"); // expired / revoked session
  }
  if (res.status === 404) notFound();
  if (res.status === 403) redirect("/");
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({}))).detail ?? res.statusText);
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => get<Meta>("/meta"),
  me: () => get<Me>("/me"),
  /** null for guests (login / signup pages) instead of redirecting. */
  meOptional: () => get<Me | null>("/me", undefined, { optional: true }),
  search: (p: { q?: string; cat?: string; car?: string; all?: boolean; any_car?: boolean; limit?: number }) => get<SearchResponse>("/search", p),
  product: (id: string) => get<ProductDetail>(`/products/${encodeURIComponent(id)}`),
  compare: (ids: string[]) => get<CompareResponse>("/products", { ids: ids.join(",") }),
  garage: (v?: string) => get<Garage>("/garage", { v }),
  ingestion: () => get<IngestionReport>("/admin/ingestion"),
  adminOverview: () => get<AdminOverview>("/admin/overview"),
  sellerDashboard: () => get<SellerDashboard>("/seller/dashboard"),
};
