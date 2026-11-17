"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import clsx from "clsx";
import { PROGRAMS, STAGES } from "@/components/programs/curriculum";

/**
 * The page's one rich moment: the roadmap drawn as a kite string that climbs from Python to project development, with
 * the brand kite flying at the end, and under it a map of which stages each program teaches. Cell notes are the
 * programs' own topics. The string draws once when the card scrolls in; reduced motion shows it drawn.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

const TONES = {
  school: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  college: "bg-brand-200 text-ink",
  university: "bg-brand-500 text-[#172033] font-medium",
};

/* Rail geometry in viewBox units: 1000 wide, 112 tall, one knot per column centre, climbing to the right. */
const H = 112;
const KNOTS = STAGES.map((_, i) => ({ x: 100 + i * 200, y: 92 - i * 17 }));

/** A smooth curve through the hand at the bottom left and every knot (Catmull-Rom turned into cubic Béziers). */
function stringPath() {
  const pts = [{ x: 0, y: H - 2 }, ...KNOTS];
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const PATH = stringPath();

export function RoadmapRail() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const show = reduce || inView;

  return (
    <div className="rounded-[24px] border border-line bg-card p-6 sm:p-8 lg:p-10">
      {/* ---------- md and up: string, stages, programs on one grid ---------- */}
      <div ref={ref} className="hidden md:grid md:grid-cols-[176px_repeat(5,minmax(0,1fr))] md:gap-x-2 lg:grid-cols-[208px_repeat(5,minmax(0,1fr))]">
        <div className="row-span-2 self-end pb-1 pr-4">
          <h2 className="text-xl font-semibold tracking-tight">One roadmap</h2>
          <p className="mt-1.5 text-sm text-muted">Five stages, always in this order. Your level sets where you start.</p>
        </div>

        <div className="relative col-span-5" style={{ height: H }} aria-hidden>
          <svg viewBox={`0 0 1000 ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <path d={PATH} fill="none" vectorEffect="non-scaling-stroke" strokeWidth="1" strokeDasharray="3 5" className="stroke-line" />
            <motion.path
              d={PATH}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="stroke-ink/60"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: show ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
            />
          </svg>
          {KNOTS.slice(0, -1).map((k, i) => (
            <motion.span
              key={i}
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-[1.5px] border-ink/70 bg-card"
              style={{ left: `${k.x / 10}%`, top: k.y }}
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: show ? 1 : 0 }}
              transition={{ duration: 0.2, delay: reduce ? 0 : 0.15 + i * 0.16, ease: EASE }}
            />
          ))}
          {/* The brand kite flies at the last stage; its tail tip sits ~31% across and ~91% down the symbol. */}
          <motion.div
            className="absolute w-12"
            style={{ left: `calc(${KNOTS[4].x / 10}% - 15px)`, top: KNOTS[4].y - 44 }}
            initial={reduce ? false : { opacity: 0, y: 12, rotate: -8 }}
            animate={show ? { opacity: 1, y: 0, rotate: 0 } : undefined}
            transition={{ duration: 0.7, delay: reduce ? 0 : 0.75, ease: EASE }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand vector */}
            <img src="/brand/iccheghuri-symbol.svg" alt="" width={256} height={256} className="h-auto w-full" />
          </motion.div>
        </div>

        <ol className="col-span-5 grid grid-cols-5 gap-x-2 pt-4">
          {STAGES.map((s, i) => (
            <li key={s.id} className="pr-2">
              <span className="font-mono text-xs text-muted tabular-nums">0{i + 1}</span>
              <p className="mt-1 font-medium leading-snug">{s.name}</p>
              <p className="mt-1 text-[13px] leading-snug text-muted">{s.hint}</p>
            </li>
          ))}
        </ol>

        <div className="col-span-6 mt-8 mb-2 border-t border-line" />

        {PROGRAMS.filter((r) => r.tone).map((r) => (
          <div key={r.name} className="contents">
            <div className="flex flex-col justify-center py-1.5 pr-4">
              <p className="text-xs text-muted">{r.level}</p>
              <p className="text-sm font-medium leading-tight">{r.name}</p>
            </div>
            {STAGES.map((s) => {
              const note = r.cells[s.id];
              return (
                <div key={s.id} className="py-1.5">
                  {note ? (
                    <div className={clsx("flex h-full min-h-11 items-center rounded-lg px-3 py-2 text-[13px] leading-tight", TONES[r.tone ?? "school"])}>
                      <span>
                        <span className="sr-only">{s.name}: </span>
                        {note}
                      </span>
                    </div>
                  ) : (
                    <div className="h-full min-h-11 rounded-lg border border-dashed border-line" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex flex-col justify-center py-1.5 pr-4">
          <p className="text-xs text-muted">All levels</p>
          <p className="text-sm font-medium leading-tight">Growth & Opportunities</p>
        </div>
        <div className="col-span-5 py-1.5">
          <div className="flex min-h-11 items-center rounded-lg bg-surface px-3 py-2 text-[13px] text-muted ring-1 ring-inset ring-line">
            Alongside every stage: verified opportunities, Career Navigator, Skill Passport and MindCare
          </div>
        </div>
      </div>

      {/* ---------- Small screens: the stages as a numbered list ---------- */}
      <div className="md:hidden">
        <h2 className="text-xl font-semibold tracking-tight">One roadmap</h2>
        <p className="mt-1.5 text-sm text-muted">Five stages, always in this order. Your level sets where you start.</p>
        <ol className="relative mt-6 space-y-5 pl-7">
          <span className="absolute top-2 bottom-2 left-[5px] border-l border-dashed border-line" aria-hidden />
          {STAGES.map((s, i) => (
            <li key={s.id} className="relative">
              <span
                className={clsx(
                  "absolute top-1.5 -left-7 size-2.5 rotate-45 rounded-[2px] border-[1.5px]",
                  i === STAGES.length - 1 ? "border-brand-500 bg-brand-500" : "border-ink/70 bg-card",
                )}
                aria-hidden
              />
              <p className="font-medium leading-snug">
                <span className="mr-2 font-mono text-xs text-muted tabular-nums">0{i + 1}</span>
                {s.name}
              </p>
              <p className="mt-0.5 text-sm text-muted">{s.hint}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
