import {
  Activity,
  ArrowUpFromLine,
  BatteryCharging,
  CircleDot,
  Cog,
  Disc3,
  Droplet,
  Droplets,
  Filter,
  Repeat,
  Snowflake,
  Sparkles,
  Waves,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PartArt } from "./art/PartArt";

const BY_CATEGORY: Record<string, LucideIcon> = {
  "brake-pad": Disc3,
  "brake-disc": CircleDot,
  "brake-fluid": Droplet,
  "engine-oil": Droplets,
  "gear-oil": Cog,
  coolant: Snowflake,
  "spark-plug": Zap,
  "ignition-coil": Zap,
  battery: BatteryCharging,
  "oil-filter": Filter,
  "air-filter": Filter,
  "cabin-filter": Filter,
  "fuel-filter": Filter,
  "shock-absorber": Activity,
  "ball-joint": CircleDot,
  "timing-belt": Repeat,
  "water-pump": Waves,
  "tool-set": Wrench,
  jack: ArrowUpFromLine,
  "car-wax": Sparkles,
  "air-compressor": Wind,
};

const BY_GROUP: Record<string, LucideIcon> = {
  brakes: Disc3,
  oils: Droplets,
  electrical: Zap,
  filters: Filter,
  suspension: Activity,
  engine: Cog,
  tools: Wrench,
  care: Sparkles,
};

const TINT: Record<string, string> = {
  brakes: "from-rose-50 to-red-100 text-brand",
  oils: "from-amber-50 to-yellow-100 text-amber-600",
  electrical: "from-sky-50 to-blue-100 text-blue-600",
  filters: "from-emerald-50 to-green-100 text-emerald-600",
  suspension: "from-violet-50 to-purple-100 text-violet-600",
  engine: "from-slate-50 to-slate-200 text-navy",
  tools: "from-orange-50 to-orange-100 text-orange-600",
  care: "from-cyan-50 to-teal-100 text-teal-600",
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = BY_CATEGORY[category] ?? Cog;
  return <Icon className={className} strokeWidth={1.5} />;
}

export function GroupIcon({ group, className }: { group: string; className?: string }) {
  const Icon = BY_GROUP[group] ?? Cog;
  return <Icon className={className} strokeWidth={1.6} />;
}

/** Product "packshot": studio backdrop + per-category illustration. */
export function ProductArt({ category, group, size = "md", label, variant }: { category: string; group: string; size?: "sm" | "md" | "lg"; label?: string | null; variant?: string | null }) {
  const box = size === "lg" ? "h-72" : size === "sm" ? "h-16 w-16" : "h-40";
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${TINT[group] ?? TINT.engine} ${box}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.95),rgba(255,255,255,0)_70%)]" />
      <PartArt category={category} label={label} variant={variant} className={`relative h-full w-full ${size === "sm" ? "p-1" : "p-3"} drop-shadow-sm transition duration-300 group-hover:scale-105`} />
    </div>
  );
}

export function groupTint(group: string) {
  return TINT[group] ?? TINT.engine;
}
