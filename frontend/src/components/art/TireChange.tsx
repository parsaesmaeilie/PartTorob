/**
 * Login-page animation (9s loop, pure SVG + CSS):
 * the car rolls in → a jack slides under and lifts it → the worn wheels drop
 * and roll away → new wheels go on → the car comes down and drives off.
 * Respects prefers-reduced-motion (shows the finished car, no movement).
 */
import { useId } from "react";
import { CarBody, Wheel, shapeOf } from "./CarArt";

const CSS = `
.tc-car{animation:tc-car 9s cubic-bezier(.45,0,.25,1) infinite}
.tc-jack{animation:tc-jack 9s ease-in-out infinite}
.tc-post{transform-box:fill-box;transform-origin:bottom;animation:tc-post 9s ease-in-out infinite}
.tc-pad{animation:tc-pad 9s ease-in-out infinite}
.tc-old{animation:tc-old 9s ease-in infinite}
.tc-new{animation:tc-new 9s ease-out infinite}
.tc-spin{transform-box:fill-box;transform-origin:center;animation:tc-spin 9s linear infinite}
.tc-done{transform-box:fill-box;transform-origin:center;animation:tc-done 9s ease-out infinite}
@keyframes tc-car{0%{transform:translate(380px,0)}12%{transform:translate(0,0)}22%{transform:translate(0,0)}30%{transform:translate(0,-14px)}68%{transform:translate(0,-14px)}76%{transform:translate(0,0)}88%{transform:translate(0,0)}100%{transform:translate(-420px,0)}}
@keyframes tc-jack{0%,12%{transform:translate(-190px,0);opacity:0}20%,76%{transform:translate(0,0);opacity:1}84%,100%{transform:translate(-190px,0);opacity:0}}
@keyframes tc-post{0%,22%{transform:scaleY(1)}30%,68%{transform:scaleY(2.1)}76%,100%{transform:scaleY(1)}}
@keyframes tc-pad{0%,22%{transform:translate(0,0)}30%,68%{transform:translate(0,-14px)}76%,100%{transform:translate(0,0)}}
@keyframes tc-old{0%,32%{transform:translate(0,0);opacity:1}40%{transform:translate(0,30px);opacity:1}49%{transform:translate(-90px,30px);opacity:0}99%{transform:translate(-90px,30px);opacity:0}100%{transform:translate(0,0);opacity:1}}
@keyframes tc-new{0%,46%{transform:translate(90px,30px);opacity:0}54%{transform:translate(0,30px);opacity:1}62%,100%{transform:translate(0,0);opacity:1}}
@keyframes tc-spin{0%{transform:rotate(0)}12%{transform:rotate(-720deg)}88%{transform:rotate(-720deg)}100%{transform:rotate(-1440deg)}}
@keyframes tc-done{0%,74%{transform:scale(.4);opacity:0}79%{transform:scale(1.1);opacity:1}84%{transform:scale(1);opacity:1}90%,100%{transform:scale(1);opacity:0}}
@media (prefers-reduced-motion: reduce){.tc-car,.tc-jack,.tc-post,.tc-pad,.tc-new,.tc-spin,.tc-done{animation:none}.tc-old,.tc-jack,.tc-done{display:none}}
`;

function OldWheel({ cx, cy, r, id }: { cx: number; cy: number; r: number; id: string }) {
  return (
    <g>
      <Wheel cx={cx} cy={cy} r={r} id={id} />
      {/* worn: dull rubber, rust-tinted rim, cracks */}
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#7c5c3b" opacity="0.45" />
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="#9ca3af" strokeOpacity="0.35" strokeDasharray="2 5" strokeWidth="3" />
    </g>
  );
}

function NewWheel({ cx, cy, r, id }: { cx: number; cy: number; r: number; id: string }) {
  return (
    <g>
      <Wheel cx={cx} cy={cy} r={r} id={id} />
      <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke="#e3262f" strokeWidth="2.5" />
      <path d={`M${cx - r * 0.5},${cy - r * 0.75} A${r},${r} 0 0 1 ${cx + r * 0.6},${cy - r * 0.7}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="2" fill="none" />
    </g>
  );
}

export function TireChange({ color = "#e3262f", className }: { color?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const s = shapeOf("sport");
  const ground = s.wheelY + s.r + 2;
  const jx = (s.wheels[0] + s.wheels[1]) / 2; // jack sits between the axles

  return (
    <svg viewBox="0 0 320 150" className={className} role="img" aria-label="انیمیشن تعویض چرخ خودرو">
      <style>{CSS}</style>
      {/* garage floor */}
      <line x1="0" y1={ground + 1} x2="320" y2={ground + 1} stroke="#fff" strokeOpacity="0.15" strokeWidth="2" />
      <ellipse cx="160" cy={ground} rx="140" ry="6" fill="#000" opacity="0.25" />

      {/* jack */}
      <g className="tc-jack">
        <rect x={jx - 28} y={ground - 8} width="56" height="8" rx="3" fill="#e3262f" />
        <circle cx={jx - 22} cy={ground} r="3" fill="#111827" />
        <circle cx={jx + 22} cy={ground} r="3" fill="#111827" />
        <rect className="tc-post" x={jx - 4} y={ground - 20} width="8" height="12" fill="#9ca3af" />
        <rect className="tc-pad" x={jx - 14} y={ground - 24} width="28" height="5" rx="2" fill="#6b7280" />
        <line x1={jx - 28} y1={ground - 4} x2={jx - 58} y2={ground - 32} stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g className="tc-car">
        <CarBody type="sport" color={color} id={id} wheels={false} shadow={false} />
        <g className="tc-old">
          {s.wheels.map((cx) => (
            <g key={cx} className="tc-spin">
              <OldWheel cx={cx} cy={s.wheelY} r={s.r} id={id} />
            </g>
          ))}
        </g>
        <g className="tc-new">
          {s.wheels.map((cx) => (
            <g key={cx} className="tc-spin">
              <NewWheel cx={cx} cy={s.wheelY} r={s.r} id={id} />
            </g>
          ))}
        </g>
      </g>

      {/* done badge */}
      <g className="tc-done">
        <circle cx="160" cy="26" r="14" fill="#10b981" />
        <path d="M153,26 l5,5 l9,-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
