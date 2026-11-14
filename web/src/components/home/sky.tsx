import type { CSSProperties } from "react";

/**
 * The hero's sky: a daylight field that turns to a charcoal evening in dark mode, slow clouds and a few far-off
 * kites in still air. Pure CSS/SVG; only the clouds move (transform), and reduced motion freezes them.
 */

const CLOUDS = [
  { top: "12%", scale: 1.1, duration: 110, delay: -20 },
  { top: "34%", scale: 0.7, duration: 150, delay: -95 },
  { top: "58%", scale: 0.9, duration: 130, delay: -60 },
  { top: "22%", scale: 0.55, duration: 170, delay: -140 },
];

const FAR_KITES = [
  { left: "8%", top: "18%", size: 26, tilt: "-6deg", tone: "#fdba74", string: 70 },
  { left: "44%", top: "8%", size: 18, tilt: "8deg", tone: "#fb923c", string: 55 },
  { left: "88%", top: "62%", size: 22, tilt: "4deg", tone: "#fed7aa", string: 64 },
];

const STARS = [
  [6, 10], [14, 32], [23, 8], [31, 22], [39, 40], [52, 14], [58, 30], [66, 6], [71, 44], [79, 18], [86, 34], [93, 9], [18, 52], [47, 56], [90, 50],
];

function Cloud({ style }: { style: CSSProperties }) {
  return (
    <svg viewBox="0 0 220 80" className="absolute left-0 h-auto w-[220px] animate-drift will-change-transform" style={style} aria-hidden>
      <path
        d="M30 70c-16 0-26-10-26-22s11-21 24-21c3-15 17-25 33-25 13 0 24 6 30 16 5-3 11-5 18-5 18 0 32 12 34 28 3-1 6-1 9-1 18 0 32 11 32 25 0 3-1 5-2 5Z"
        className="fill-white/80 dark:fill-[#2a2a2a]/60"
      />
    </svg>
  );
}

export function FarKite({ size, tone, string }: { size: number; tone: string; string: number }) {
  return (
    <svg width={size} height={size + string} viewBox={`0 0 20 ${20 + string}`} aria-hidden className="overflow-visible">
      <path d={`M10 19 C 14 ${19 + string * 0.35}, 4 ${19 + string * 0.65}, 10 ${19 + string}`} className="stroke-ink/25" strokeWidth="0.6" fill="none" />
      <path d="M10 0 L19 8 L10 19 L1 8 Z" fill={tone} />
      <path d="M10 0 L10 19 M1 8 L19 8" className="stroke-black/15" strokeWidth="0.6" />
    </svg>
  );
}

export function Sky() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Day: high pale blue fading to the warm horizon. Night: deep navy to a last trace of sunset orange. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#cfe8fb_0%,#e6f3fd_38%,#fff4e6_82%,var(--color-surface)_100%)] dark:bg-[linear-gradient(180deg,#0c0c0c_0%,#141414_50%,#1f1712_82%,var(--color-surface)_100%)]" />
      <div className="absolute inset-0 hidden dark:block">
        {STARS.map(([x, y], i) => (
          <span key={i} className="absolute size-[2px] rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, opacity: i % 3 === 0 ? 0.9 : 0.5 }} />
        ))}
      </div>
      {CLOUDS.map((c, i) => (
        <Cloud
          key={i}
          style={{ top: c.top, scale: String(c.scale), "--drift-duration": `${c.duration}s`, animationDelay: `${c.delay}s` } as CSSProperties}
        />
      ))}
      {FAR_KITES.map((k, i) => (
        <div key={i} className="absolute opacity-70" style={{ left: k.left, top: k.top, rotate: k.tilt }}>
          <FarKite size={k.size} tone={k.tone} string={k.string} />
        </div>
      ))}
    </div>
  );
}
