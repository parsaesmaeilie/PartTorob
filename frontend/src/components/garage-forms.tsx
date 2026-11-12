"use client";

import { Check, Gauge, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { postJson } from "./actions";
import { CarArt } from "./art/CarArt";

function useGarageAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (url: string, body?: object, after?: () => void, method = "POST") =>
    start(async () => {
      setError(null);
      try {
        await postJson(url, body, method);
        after?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });
  return { pending, error, run };
}

const COLORS = ["#e3262f", "#f1f5f9", "#94a3b8", "#111827", "#1e3a8a", "#0f766e", "#f59e0b"];

export function AddVehicleForm({ models }: { models: { id: string; title: string; bodyType: string; years: [number, number] }[] }) {
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState(models[0]?.id);
  const [color, setColor] = useState(COLORS[0]);
  const { pending, error, run } = useGarageAction();
  const body = models.find((m) => m.id === modelId)?.bodyType ?? "sedan";
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="card flex min-h-36 w-full flex-col items-center justify-center gap-2 border-dashed text-muted hover:border-brand hover:text-brand">
        <CarArt type="sedan" color="#e7e9ef" className="w-32 opacity-80" />
        <span className="flex items-center gap-1">
          <Plus className="h-5 w-5" /> افزودن خودرو
        </span>
      </button>
    );
  return (
    <form
      className="card space-y-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget));
        run("/api/garage/vehicles", { ...f, color, year: Number(f.year), odometerKm: Number(f.odometerKm) }, () => setOpen(false));
      }}
    >
      <div className="flex items-center justify-between text-sm font-bold">
        خودروی جدید
        <button type="button" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex h-24 items-end justify-center rounded-xl bg-gradient-to-b from-slate-50 to-slate-200 px-2">
        <CarArt type={body} color={color} className="w-full" />
      </div>
      <div className="flex justify-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`رنگ ${c}`}
            className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-brand ring-2 ring-brand/20" : "border-line"}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <select name="modelId" className="input" required value={modelId} onChange={(e) => setModelId(e.target.value)}>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input name="year" type="number" placeholder="سال ساخت (۱۳۹۸)" className="input" min={1370} max={1405} required />
        <input name="odometerKm" type="number" placeholder="کارکرد (کیلومتر)" className="input" min={0} required />
      </div>
      <input name="nickname" placeholder="نام دلخواه (اختیاری)" className="input" />
      <input name="plate" placeholder="پلاک (اختیاری)" className="input" />
      {error && <p className="text-xs text-brand">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} ثبت در گاراژ
      </button>
    </form>
  );
}

export function VehicleActions({ vehicleId, active }: { vehicleId: string; active: boolean }) {
  const { pending, run } = useGarageAction();
  return (
    <div className="flex gap-1">
      {!active && (
        <button disabled={pending} onClick={() => run(`/api/garage/vehicles/${vehicleId}/activate`)} className="chip border border-line hover:border-brand">
          انتخاب
        </button>
      )}
      <button disabled={pending} onClick={() => run(`/api/garage/vehicles/${vehicleId}`, undefined, undefined, "DELETE")} className="chip text-muted hover:text-brand" aria-label="حذف خودرو">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function OdometerForm({ vehicleId, current }: { vehicleId: string; current: number }) {
  const { pending, error, run } = useGarageAction();
  const [km, setKm] = useState(String(current));
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(`/api/garage/vehicles/${vehicleId}/odometer`, { km: Number(km) }, undefined, "PATCH");
      }}
    >
      <Gauge className="h-5 w-5 text-muted" />
      <input value={km} onChange={(e) => setKm(e.target.value)} type="number" className="input w-36 py-1.5" aria-label="کیلومتر فعلی" />
      <button className="btn-ghost py-1.5" disabled={pending}>
        به‌روزرسانی کیلومتر
      </button>
      {error && <span className="w-full text-xs text-brand">{error}</span>}
    </form>
  );
}

export function LogServiceButton({ vehicleId, serviceId, km }: { vehicleId: string; serviceId: string; km: number }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useGarageAction();
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="chip border border-line hover:border-emerald-600 hover:text-emerald-700">
        <Check className="h-3.5 w-3.5" /> انجام شد
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(`/api/garage/vehicles/${vehicleId}/services`, { serviceId, km: Number(f.get("km")), cost: Number(f.get("cost")) || undefined }, () => setOpen(false));
      }}
    >
      <input name="km" type="number" defaultValue={km} className="input w-28 py-1 text-xs" aria-label="کیلومتر" />
      <input name="cost" type="number" placeholder="هزینه (تومان)" className="input w-32 py-1 text-xs" />
      <button className="chip bg-emerald-600 text-white" disabled={pending}>
        ثبت
      </button>
      <button type="button" onClick={() => setOpen(false)} className="chip">
        <X className="h-3 w-3" />
      </button>
      {error && <span className="text-xs text-brand">{error}</span>}
    </form>
  );
}
