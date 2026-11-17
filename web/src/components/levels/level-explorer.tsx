"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import { Bot, ClipboardCheck, FlaskConical } from "lucide-react";
import { Tabs as MotionTabs, TabsContent, TabsList, TabsTrigger } from "@/components/beui/tabs";
import { Badge } from "@/components/ui";
import { DEMO_COURSES, hours } from "@/components/programs/curriculum";
import { LEVELS, type EducationLevel } from "@/lib/types";

/**
 * The levels page's one rich moment: pick a level and the kite climbs to it in a small patch of the home page's sky,
 * while the panel beside it shows what that level includes. Only the kite moves (transform), and reduced motion jumps.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

const DETAILS: Record<EducationLevel, { tutor: string; projects: string; assessment: string }> = {
  school: {
    tutor: "Simple language, everyday examples, short steps and lots of encouragement.",
    projects: "Visual, unplugged and block-style activities, and your first lines of Python.",
    assessment: "Short concept checks on logic and AI basics.",
  },
  college: {
    tutor: "Clear technical vocabulary with worked examples and code snippets.",
    projects: "Guided Colab notebooks: data cleaning and simple classifiers.",
    assessment: "Topic tests on Python and AI fundamentals.",
  },
  university: {
    tutor: "Rigorous explanations, maths where useful, references and trade-offs.",
    projects: "End-to-end machine learning and deep learning projects for your portfolio.",
    assessment: "Machine learning, deep learning and applied problem-solving tests.",
  },
};

/** Where each level flies, as a share of the sky's height from the bottom, and what the mark beside it says. */
const ALTITUDE: Record<EducationLevel, { at: number; mark: string; tilt: number }> = {
  school: { at: 0.24, mark: "Classes 6–10", tilt: -6 },
  college: { at: 0.52, mark: "HSC", tilt: 0 },
  university: { at: 0.8, mark: "University", tilt: 6 },
};

const ROWS = [
  { key: "tutor", label: "AI Smart Tutor", icon: Bot },
  { key: "projects", label: "Projects", icon: FlaskConical },
  { key: "assessment", label: "Assessment", icon: ClipboardCheck },
] as const;

function SkyPatch({ level }: { level: EducationLevel }) {
  const reduce = useReducedMotion();
  const current = ALTITUDE[level];
  return (
    <div className="relative h-56 overflow-hidden rounded-[20px] border border-line sm:h-64 lg:h-full lg:min-h-[420px]" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#cfe8fb_0%,#e6f3fd_45%,#fff4e6_100%)] dark:bg-[linear-gradient(180deg,#0c0c0c_0%,#141414_55%,#1f1712_100%)]" />

      {/* Altitude marks, one per level. */}
      {LEVELS.map((l) => {
        const a = ALTITUDE[l.value];
        const on = l.value === level;
        return (
          <div key={l.value} className="absolute inset-x-0 flex items-center gap-2 pr-4" style={{ bottom: `${a.at * 100}%` }}>
            <span className="h-px flex-1 bg-[repeating-linear-gradient(to_right,var(--color-ink)_0_3px,transparent_3px_7px)] opacity-15" />
            <span className={clsx("translate-y-px text-xs transition-colors duration-200", on ? "font-medium text-ink" : "text-muted")}>{a.mark}</span>
          </div>
        );
      })}

      {/* The box is as tall as the sky, so a percentage translate moves the kite's centre to the level's mark. */}
      <motion.div
        className="absolute inset-y-0 left-[30%] w-0"
        initial={false}
        animate={{ y: `${(1 - current.at) * 100}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
      >
        <motion.div
          className="absolute top-0 left-0 w-14 -translate-x-1/2 -translate-y-[60%] sm:w-16"
          initial={false}
          animate={{ rotate: current.tilt }}
          transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand vector */}
          <img src="/brand/iccheghuri-symbol.svg" alt="" width={256} height={256} className="relative z-10 h-auto w-full drop-shadow-[0_8px_12px_rgb(23_32_51/0.14)]" />
          {/* The string runs from the tail down past the bottom edge; the sky clips it. */}
          <svg viewBox="0 0 120 600" className="absolute top-[88%] left-[24%] h-[600px] w-[120px]" fill="none">
            <path d="M4 0 C 30 140, -10 300, 40 600" className="stroke-ink/30" strokeWidth="1" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function LevelExplorer() {
  const [level, setLevel] = useState<EducationLevel>("school");

  return (
    <MotionTabs value={level} onValueChange={(v) => setLevel(v as EducationLevel)} variant="segment">
      <TabsList aria-label="Learning level" wrapperClassName="w-auto">
        {LEVELS.map((l) => (
          <TabsTrigger key={l.value} value={l.value} className="px-5 py-2 sm:px-6">
            {l.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.6fr)] lg:gap-6">
        <SkyPatch level={level} />

        <div className="grid">
          {LEVELS.map((l) => {
            const d = DETAILS[l.value];
            return (
              <TabsContent key={l.value} value={l.value} className="col-start-1 row-start-1 mt-0 rounded-[20px]">
                <div className="h-full rounded-[20px] border border-line bg-card p-6 sm:p-8">
                  <p className="text-sm font-medium text-brand-600">{l.tag}</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight">{l.label}</h2>
                  <p className="mt-3 max-w-xl leading-relaxed text-muted">{l.blurb}</p>

                  <dl className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-3 sm:gap-8">
                    {ROWS.map(({ key, label, icon: Icon }) => (
                      <div key={key}>
                        <dt className="flex items-center gap-2 font-medium">
                          <Icon className="size-[18px] text-muted" strokeWidth={1.5} aria-hidden />
                          {label}
                        </dt>
                        <dd className="mt-2 text-sm leading-relaxed text-muted">{d[key]}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-8 border-t border-line pt-6">
                    <p className="flex items-center gap-2 text-sm text-muted">
                      Courses at this level <Badge>Demo</Badge>
                    </p>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {DEMO_COURSES[l.value].map((c) => (
                        <li key={c.title} className="flex items-baseline justify-between gap-4 rounded-xl border border-line px-4 py-3 text-sm">
                          <span className="font-medium">{c.title}</span>
                          <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{hours(c.hours)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </div>
      </div>
    </MotionTabs>
  );
}
