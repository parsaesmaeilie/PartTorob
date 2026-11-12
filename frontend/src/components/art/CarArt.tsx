/**
 * Side-view car illustrations — one silhouette per body type, painted in the
 * vehicle's own colour (the user picks it in the garage). Pure SVG: crisp at
 * any size, no external images, themeable.
 */
import { useId } from "react";

export type BodyType = "hatchback" | "sedan" | "suv" | "truck" | "sport";

interface Shape {
  body: string;
  windows: string[];
  wheels: [number, number];
  r: number;
  wheelY: number;
  headlight: [number, number];
  tail: [number, number];
  extra?: string; // spoiler, bed, roof rails …
  door: number[]; // x positions of door seams
}

const SHAPES: Record<BodyType, Shape> = {
  hatchback: {
    body: "M20,100 L22,82 Q28,70 60,65 L96,60 Q122,36 152,32 L230,31 Q262,33 278,58 L294,64 Q302,70 302,86 L302,100 Z",
    windows: ["M104,60 Q126,41 152,38 L188,37 L188,60 Z", "M194,37 L228,36 Q252,38 266,58 L194,60 Z"],
    wheels: [80, 248], r: 22, wheelY: 102, headlight: [26, 78], tail: [298, 70], door: [190],
  },
  sedan: {
    body: "M14,100 L16,82 Q24,71 56,66 L94,62 Q120,38 150,34 L210,33 Q238,35 256,58 L292,62 Q306,66 306,84 L306,100 Z",
    windows: ["M102,62 Q124,43 150,40 L180,39 L180,62 Z", "M186,39 L208,38 Q232,41 246,60 L186,62 Z"],
    wheels: [76, 252], r: 22, wheelY: 102, headlight: [20, 78], tail: [302, 70], door: [182, 250],
  },
  suv: {
    body: "M16,106 L16,78 Q22,64 54,60 L88,56 Q108,28 140,24 L264,22 Q288,24 296,52 L304,60 L304,106 Z",
    windows: ["M96,56 Q114,32 140,30 L180,30 L180,56 Z", "M186,30 L232,30 L232,56 L186,56 Z", "M238,30 L262,29 Q278,32 286,54 L238,56 Z"],
    wheels: [78, 250], r: 25, wheelY: 106, headlight: [20, 74], tail: [300, 66], door: [183, 235],
    extra: "M150,19 L272,17",
  },
  truck: {
    body: "M14,106 L14,80 Q18,66 46,62 L84,58 Q102,30 128,26 L208,26 L212,60 L306,60 L306,106 Z",
    windows: ["M92,58 Q108,34 128,32 L162,32 L162,58 Z", "M168,32 L202,32 L205,58 L168,58 Z"],
    wheels: [74, 254], r: 25, wheelY: 106, headlight: [18, 76], tail: [302, 70], door: [165, 210],
    extra: "M214,60 L214,52 L306,52 L306,60",
  },
  sport: {
    body: "M12,100 L14,88 Q20,77 60,71 L110,64 Q148,40 180,38 L222,40 Q258,46 284,66 L304,74 Q312,80 310,96 L308,100 Z",
    windows: ["M122,64 Q150,46 180,44 L198,44 L198,64 Z", "M204,44 L220,45 Q246,50 266,64 L204,64 Z"],
    wheels: [76, 254], r: 21, wheelY: 100, headlight: [20, 84], tail: [306, 80], door: [200],
    extra: "M284,64 L306,56 L310,60 L294,70 Z",
  },
};

export function Wheel({ cx, cy, r, id }: { cx: number; cy: number; r: number; id: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 4} fill="#0b0f19" opacity="0.85" />
      <circle cx={cx} cy={cy} r={r} fill="#1f2430" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill={`url(#rim-${id})`} stroke="#9aa3b2" strokeWidth="1" />
      {[0, 72, 144, 216, 288].map((a) => (
        <line key={a} x1={cx} y1={cy} x2={cx + Math.cos((a * Math.PI) / 180) * r * 0.58} y2={cy + Math.sin((a * Math.PI) / 180) * r * 0.58} stroke="#6b7385" strokeWidth="2.2" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.16} fill="#4b5262" />
    </g>
  );
}

export function shapeOf(type?: string): Shape {
  return SHAPES[(type as BodyType) in SHAPES ? (type as BodyType) : "sedan"];
}

/** The car's SVG content (no <svg> wrapper) — lets animations place and move parts separately. */
export function CarBody({ type = "sedan", color = "#e3262f", id, wheels = true, shadow = true }: { type?: BodyType | string; color?: string | null; id: string; wheels?: boolean; shadow?: boolean }) {
  const s = shapeOf(type);
  const paint = color || "#e3262f";
  return (
    <g>
      <defs>
        <linearGradient id={`shine-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`glass-${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9fb4d6" />
          <stop offset="0.5" stopColor="#2b3a55" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
        <radialGradient id={`rim-${id}`}>
          <stop offset="0" stopColor="#f1f4f8" />
          <stop offset="1" stopColor="#a7afbd" />
        </radialGradient>
      </defs>
      {shadow && <ellipse cx="160" cy={s.wheelY + s.r + 2} rx="150" ry="7" fill="#0b0f19" opacity="0.18" />}
      <path d={s.body} fill={paint} stroke="#0b0f19" strokeOpacity="0.25" strokeWidth="1.2" />
      <path d={s.body} fill={`url(#shine-${id})`} />
      {s.extra && <path d={s.extra} fill={s.extra.endsWith("Z") ? paint : "none"} stroke="#0b0f19" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />}
      {s.windows.map((w) => (
        <path key={w} d={w} fill={`url(#glass-${id})`} stroke="#0b0f19" strokeOpacity="0.5" strokeWidth="1.5" />
      ))}
      {/* character line + door seams */}
      <path d={`M${s.headlight[0] + 20},${s.wheelY - 22} L${s.tail[0] - 14},${s.wheelY - 24}`} stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
      {s.door.map((x) => (
        <line key={x} x1={x} y1={s.wheelY - 44} x2={x + 1} y2={s.wheelY - 6} stroke="#0b0f19" strokeOpacity="0.25" strokeWidth="1.2" />
      ))}
      <rect x={s.headlight[0] - 6} y={s.headlight[1] - 4} width="16" height="7" rx="3.5" fill="#fff7d6" stroke="#f59e0b" strokeOpacity="0.6" />
      <rect x={s.tail[0] - 8} y={s.tail[1] - 4} width="9" height="10" rx="2.5" fill="#dc2626" />
      {wheels && (
        <>
          <Wheel cx={s.wheels[0]} cy={s.wheelY} r={s.r} id={id} />
          <Wheel cx={s.wheels[1]} cy={s.wheelY} r={s.r} id={id} />
        </>
      )}
    </g>
  );
}

export function CarArt({ type = "sedan", color = "#e3262f", className }: { type?: BodyType | string; color?: string | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 320 135" className={className} role="img" aria-label="خودرو">
      <CarBody type={type} color={color} id={id} />
    </svg>
  );
}

export const BODY_TYPE_FA: Record<string, string> = { hatchback: "هاچ‌بک", sedan: "سدان", suv: "شاسی‌بلند", truck: "وانت", sport: "اسپرت" };
