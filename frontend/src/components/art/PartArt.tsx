/**
 * Product illustrations, one per category. "Studio shot" look: soft floor
 * shadow, metal gradients, brand-coloured labels. `label` prints a spec on
 * the product (e.g. 10W40, 74Ah) so cards feel like real packshots.
 */
import { useId } from "react";

type P = { id: string; label?: string; accent?: string };

const Metal = ({ id }: { id: string }) => (
  <>
    <linearGradient id={`m-${id}`} x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stopColor="#f3f5f8" />
      <stop offset="0.45" stopColor="#b9c0cc" />
      <stop offset="1" stopColor="#7d8696" />
    </linearGradient>
    <linearGradient id={`d-${id}`} x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="#4a4f5c" />
      <stop offset="1" stopColor="#1c1f27" />
    </linearGradient>
    <linearGradient id={`g-${id}`} x1="0" x2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0" />
      <stop offset="0.5" stopColor="#fff" stopOpacity="0.45" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  </>
);

const Shadow = ({ w = 70, y = 146 }: { w?: number; y?: number }) => <ellipse cx="100" cy={y} rx={w} ry="6" fill="#0b0f19" opacity="0.16" />;

const Label = ({ x, y, text, size = 11, color = "#fff" }: { x: number; y: number; text?: string; size?: number; color?: string }) =>
  text ? (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="800" fill={color} fontFamily="Vazirmatn, Tahoma, sans-serif" direction="ltr">
      {text}
    </text>
  ) : null;

function BrakePad({ id }: P) {
  const pad = (dx: number, dy: number) => (
    <g transform={`translate(${dx} ${dy})`}>
      <path d="M28,58 Q30,26 100,24 Q170,26 172,58 L162,98 Q100,84 38,98 Z" fill={`url(#m-${id})`} stroke="#6b7385" />
      <path d="M40,60 Q44,38 100,36 Q156,38 160,60 L152,90 Q100,78 48,90 Z" fill="#3b2f2a" />
      <path d="M40,60 Q44,38 100,36 Q156,38 160,60 L152,90 Q100,78 48,90 Z" fill="url(#tex)" opacity="0.35" />
      <line x1="100" y1="37" x2="100" y2="82" stroke="#1a1411" strokeWidth="2.5" />
      <circle cx="44" cy="52" r="4" fill="#5b6270" />
      <circle cx="156" cy="52" r="4" fill="#5b6270" />
    </g>
  );
  return (
    <>
      <Shadow w={78} />
      {pad(-6, 22)}
      {pad(8, 8)}
      <path d="M150,30 q14,-8 18,6" stroke="#d1d5db" strokeWidth="3" fill="none" />
    </>
  );
}

function BrakeDisc({ id }: P) {
  return (
    <>
      <Shadow w={72} />
      <circle cx="96" cy="80" r="64" fill={`url(#m-${id})`} stroke="#6b7385" />
      <circle cx="96" cy="80" r="62" fill="none" stroke="#fff" strokeOpacity="0.5" strokeDasharray="1 5" strokeWidth="6" />
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return <circle key={i} cx={96 + Math.cos(a) * 46} cy={80 + Math.sin(a) * 46} r="2.6" fill="#59606e" />;
      })}
      <circle cx="96" cy="80" r="28" fill="#8a919f" stroke="#59606e" strokeWidth="2" />
      <circle cx="96" cy="80" r="10" fill="#3a3f4b" />
      {[0, 72, 144, 216, 288].map((d) => (
        <circle key={d} cx={96 + Math.cos((d * Math.PI) / 180) * 19} cy={80 + Math.sin((d * Math.PI) / 180) * 19} r="3.5" fill="#3a3f4b" />
      ))}
      <path d="M140,34 Q178,52 176,92 L158,104 Q160,66 132,48 Z" fill="#e3262f" stroke="#9f1219" />
    </>
  );
}

function Jug({ label, accent = "#111827", body = "#fbbf24", small = false }: P & { body?: string; small?: boolean }) {
  const s = small ? 0.72 : 1;
  return (
    <>
      <Shadow w={small ? 40 : 56} />
      <g transform={`translate(${100 - 100 * s} ${146 - 146 * s}) scale(${s})`}>
        <path d="M58,40 L58,30 Q58,22 66,22 L96,22 L96,14 L118,14 L118,22 L132,22 Q142,22 142,34 L142,138 Q142,146 134,146 L66,146 Q58,146 58,138 Z" fill={body} stroke="#0b0f19" strokeOpacity="0.25" />
        <path d="M118,30 L134,30 Q138,30 138,36 L138,66 L124,66 L124,40 Q124,34 118,34 Z" fill="#fff" opacity="0.35" />
        <rect x="94" y="6" width="26" height="12" rx="3" fill={accent} />
        <rect x="64" y="70" width="72" height="62" rx="6" fill={accent} />
        <rect x="64" y="70" width="72" height="14" rx="6" fill="#fff" opacity="0.12" />
        <Label x={100} y={110} text={label} size={label && label.length > 6 ? 11 : 14} />
        <path d="M66,40 L66,138" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
      </g>
    </>
  );
}

function SparkPlug({ id, label }: P) {
  return (
    <>
      <Shadow w={34} />
      <g transform="rotate(-18 100 80)">
        <rect x="93" y="8" width="14" height="14" rx="2" fill={`url(#m-${id})`} />
        <path d="M86,22 L114,22 L112,72 L88,72 Z" fill="#f8fafc" stroke="#cbd5e1" />
        {[30, 40, 50].map((y) => (
          <line key={y} x1="87" y1={y} x2="113" y2={y} stroke="#cbd5e1" strokeWidth="2" />
        ))}
        <rect x="84" y="72" width="32" height="22" rx="2" fill={`url(#m-${id})`} stroke="#6b7385" />
        <line x1="100" y1="72" x2="100" y2="94" stroke="#6b7385" />
        <rect x="90" y="94" width="20" height="36" fill={`url(#m-${id})`} />
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1="90" y1={97 + i * 4} x2="110" y2={99 + i * 4} stroke="#6b7385" strokeWidth="1.3" />
        ))}
        <path d="M98,130 L98,140 L108,140" stroke="#6b7385" strokeWidth="3" fill="none" />
        <Label x={100} y={60} text={label} size={7} color="#1e3a8a" />
      </g>
    </>
  );
}

function Battery({ id, label, accent = "#1e3a8a" }: P) {
  return (
    <>
      <Shadow w={72} />
      <rect x="54" y="30" width="14" height="12" rx="2" fill="#dc2626" />
      <rect x="132" y="30" width="14" height="12" rx="2" fill="#374151" />
      <path d="M30,44 L170,44 L170,140 Q170,144 166,144 L34,144 Q30,144 30,140 Z" fill={`url(#d-${id})`} />
      <rect x="30" y="40" width="140" height="18" rx="3" fill="#2d323d" />
      <rect x="44" y="70" width="112" height="56" rx="6" fill={accent} />
      <rect x="44" y="70" width="112" height="10" rx="5" fill="#fff" opacity="0.15" />
      <path d="M100,78 L90,98 L101,98 L95,118 L112,92 L101,92 L106,78 Z" fill="#fbbf24" />
      <Label x={136} y={112} text={label} size={11} />
      <text x="61" y="54" fontSize="12" fontWeight="900" fill="#fca5a5">+</text>
      <text x="136" y="54" fontSize="12" fontWeight="900" fill="#9ca3af">−</text>
    </>
  );
}

function Canister({ id, accent = "#1d4ed8", label }: P) {
  return (
    <>
      <Shadow w={48} />
      <ellipse cx="100" cy="132" rx="44" ry="12" fill="#1f2937" />
      <path d="M56,46 L56,132 Q100,146 144,132 L144,46 Z" fill={accent} />
      <path d="M56,46 L56,132 Q100,146 144,132 L144,46 Z" fill={`url(#g-${id})`} />
      <ellipse cx="100" cy="46" rx="44" ry="12" fill={`url(#m-${id})`} stroke="#6b7385" />
      <circle cx="100" cy="46" r="10" fill="#4b5262" />
      {Array.from({ length: 9 }).map((_, i) => (
        <circle key={i} cx={100 + Math.cos((i / 9) * 6.28) * 26} cy={46 + Math.sin((i / 9) * 6.28) * 7} r="2.5" fill="#6b7385" />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <line key={i} x1={60 + i * 9} y1="118" x2={60 + i * 9} y2="134" stroke="#0b0f19" strokeOpacity="0.25" strokeWidth="3" />
      ))}
      <Label x={100} y={96} text={label} size={12} />
    </>
  );
}

function PanelFilter({ accent = "#f8fafc" }: P) {
  return (
    <>
      <Shadow w={78} />
      <g transform="skewX(-14) translate(22 0)">
        <rect x="24" y="44" width="150" height="88" rx="6" fill="#111827" />
        <rect x="32" y="52" width="134" height="72" fill={accent} />
        <path d={Array.from({ length: 16 }).map((_, i) => `M${36 + i * 8},52 L${40 + i * 8},124`).join(" ")} stroke="#cbd5e1" strokeWidth="3" />
        <path d={Array.from({ length: 16 }).map((_, i) => `M${40 + i * 8},52 L${36 + i * 8},124`).join(" ")} stroke="#e2e8f0" strokeWidth="1" />
      </g>
    </>
  );
}

function Shock({ id }: P) {
  const coil = Array.from({ length: 9 })
    .map((_, i) => `M70,${30 + i * 9} Q100,${24 + i * 9} 130,${34 + i * 9}`)
    .join(" ");
  return (
    <>
      <Shadow w={40} />
      <circle cx="100" cy="16" r="9" fill="none" stroke={`url(#m-${id})`} strokeWidth="6" />
      <rect x="95" y="22" width="10" height="56" fill={`url(#m-${id})`} />
      <ellipse cx="100" cy="28" rx="34" ry="6" fill="#374151" />
      <path d={coil} stroke="#e3262f" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="84" y="74" width="32" height="62" rx="4" fill={`url(#d-${id})`} />
      <ellipse cx="100" cy="112" rx="34" ry="6" fill="#374151" />
      <circle cx="100" cy="142" r="7" fill="none" stroke="#4b5262" strokeWidth="5" />
    </>
  );
}

function Belt({ id }: P) {
  return (
    <>
      <Shadow w={80} />
      <rect x="22" y="30" width="156" height="104" rx="52" fill="none" stroke="#111827" strokeWidth="14" />
      <rect x="22" y="30" width="156" height="104" rx="52" fill="none" stroke="#374151" strokeWidth="14" strokeDasharray="3 4" />
      <circle cx="74" cy="82" r="30" fill={`url(#m-${id})`} stroke="#6b7385" />
      <circle cx="74" cy="82" r="8" fill="#4b5262" />
      <circle cx="132" cy="82" r="22" fill={`url(#m-${id})`} stroke="#6b7385" />
      <circle cx="132" cy="82" r="6" fill="#4b5262" />
    </>
  );
}

function WaterPump({ id }: P) {
  return (
    <>
      <Shadow w={62} />
      <path d="M60,60 Q60,40 90,40 L150,46 Q170,50 166,74 L160,120 Q156,136 136,134 L80,128 Q58,126 58,104 Z" fill={`url(#m-${id})`} stroke="#6b7385" />
      <circle cx="104" cy="86" r="34" fill="#9aa3b2" stroke="#6b7385" strokeWidth="2" />
      <circle cx="104" cy="86" r="22" fill={`url(#m-${id})`} />
      {[0, 90, 180, 270].map((a) => (
        <circle key={a} cx={104 + Math.cos((a * Math.PI) / 180) * 14} cy={86 + Math.sin((a * Math.PI) / 180) * 14} r="3" fill="#4b5262" />
      ))}
      <rect x="150" y="96" width="30" height="14" rx="4" fill="#6b7385" />
    </>
  );
}

function ToolBox({ id }: P) {
  return (
    <>
      <Shadow w={84} />
      <rect x="18" y="40" width="164" height="96" rx="10" fill="#e3262f" />
      <rect x="26" y="48" width="148" height="80" rx="6" fill="#1f2937" />
      {Array.from({ length: 12 }).map((_, i) => (
        <circle key={i} cx={40 + (i % 6) * 24} cy={i < 6 ? 68 : 96} r={6 + (i % 6)} fill={`url(#m-${id})`} stroke="#4b5262" />
      ))}
      <rect x="36" y="112" width="96" height="8" rx="4" fill={`url(#m-${id})`} />
      <rect x="84" y="30" width="32" height="12" rx="4" fill="#9f1219" />
    </>
  );
}

function Jack({ id }: P) {
  return (
    <>
      <Shadow w={82} />
      <rect x="20" y="112" width="150" height="16" rx="5" fill="#e3262f" />
      <circle cx="34" cy="134" r="9" fill="#1f2937" />
      <circle cx="152" cy="134" r="9" fill="#1f2937" />
      <path d="M60,112 L140,58 L150,68 L80,114 Z" fill="#b81d25" />
      <rect x="132" y="48" width="34" height="10" rx="3" fill={`url(#m-${id})`} />
      <line x1="40" y1="112" x2="10" y2="64" stroke="#374151" strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

function WaxTin({ id, accent = "#fbbf24" }: P) {
  return (
    <>
      <Shadow w={64} />
      <path d="M38,74 L38,118 Q100,142 162,118 L162,74 Z" fill={`url(#d-${id})`} />
      <ellipse cx="100" cy="74" rx="62" ry="20" fill={accent} />
      <ellipse cx="100" cy="72" rx="50" ry="14" fill="#fff" opacity="0.25" />
      <text x="100" y="78" textAnchor="middle" fontSize="13" fontWeight="900" fill="#7c2d12">GOLD</text>
      <ellipse cx="100" cy="74" rx="62" ry="20" fill={`url(#g-${id})`} />
    </>
  );
}

function Compressor({ id }: P) {
  return (
    <>
      <Shadow w={70} />
      <rect x="40" y="52" width="120" height="78" rx="14" fill="#1f2937" />
      <rect x="40" y="52" width="120" height="20" rx="10" fill="#e3262f" />
      <circle cx="80" cy="100" r="20" fill="#f8fafc" stroke={`url(#m-${id})`} strokeWidth="5" />
      <line x1="80" y1="100" x2="92" y2="90" stroke="#e3262f" strokeWidth="2.5" />
      <rect x="112" y="88" width="34" height="26" rx="4" fill="#111827" stroke="#374151" />
      <path d="M160,96 Q188,96 184,128 Q180,146 150,144" stroke="#111827" strokeWidth="5" fill="none" />
    </>
  );
}

const OIL_BODY: Record<string, { body: string; accent: string; small?: boolean }> = {
  "engine-oil": { body: "#f5c542", accent: "#111827" },
  "gear-oil": { body: "#1d4ed8", accent: "#0b1736" },
  coolant: { body: "#22c55e", accent: "#14532d" },
  "brake-fluid": { body: "#f8fafc", accent: "#1e3a8a", small: true },
};

const OIL_PALETTE = [
  { body: "#f5c542", accent: "#111827" },
  { body: "#16a34a", accent: "#052e16" },
  { body: "#1f2937", accent: "#b91c1c" },
  { body: "#e5e7eb", accent: "#1e3a8a" },
  { body: "#dc2626", accent: "#111827" },
  { body: "#0ea5e9", accent: "#0c4a6e" },
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function PartArt({ category, label, variant, className }: { category: string; label?: string | null; variant?: string | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  const p: P = { id, label: label ?? undefined };
  let el: React.ReactNode;
  if (category === "engine-oil" && variant) el = <Jug {...p} {...OIL_PALETTE[hash(variant) % OIL_PALETTE.length]} />;
  else if (OIL_BODY[category]) el = <Jug {...p} {...OIL_BODY[category]} />;
  else
    switch (category) {
      case "brake-pad":
        el = <BrakePad {...p} />;
        break;
      case "brake-disc":
        el = <BrakeDisc {...p} />;
        break;
      case "spark-plug":
      case "ignition-coil":
        el = <SparkPlug {...p} />;
        break;
      case "battery":
        el = <Battery {...p} />;
        break;
      case "oil-filter":
        el = <Canister {...p} accent="#1d4ed8" />;
        break;
      case "fuel-filter":
        el = <Canister {...p} accent="#16a34a" />;
        break;
      case "air-filter":
        el = <PanelFilter {...p} accent="#fef3c7" />;
        break;
      case "cabin-filter":
        el = <PanelFilter {...p} accent="#f1f5f9" />;
        break;
      case "shock-absorber":
      case "ball-joint":
        el = <Shock {...p} />;
        break;
      case "timing-belt":
        el = <Belt {...p} />;
        break;
      case "water-pump":
        el = <WaterPump {...p} />;
        break;
      case "tool-set":
        el = <ToolBox {...p} />;
        break;
      case "jack":
        el = <Jack {...p} />;
        break;
      case "car-wax":
        el = <WaxTin {...p} />;
        break;
      default:
        el = <Compressor {...p} />;
    }
  return (
    <svg viewBox="0 0 200 160" className={className} role="img" aria-label={category}>
      <defs>
        <Metal id={id} />
        <pattern id="tex" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="#fff" />
        </pattern>
      </defs>
      {el}
    </svg>
  );
}

/** Short spec printed on the packshot. */
export function productLabel(p: { brandName: string; attributes: { viscosity?: string | null; ampere?: number | null; plugCode?: string | null } }) {
  return p.attributes.viscosity ?? (p.attributes.ampere ? `${p.attributes.ampere}Ah` : null) ?? p.attributes.plugCode ?? null;
}
