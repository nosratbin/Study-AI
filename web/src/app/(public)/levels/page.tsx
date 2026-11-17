import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { ScrollReveal } from "@/components/beui/scroll-reveal";
import { PageIntro } from "@/components/programs/page-intro";
import { LevelExplorer } from "@/components/levels/level-explorer";

export const metadata: Metadata = { title: "Learning levels" };

/*
 * Learning levels. The explorer is the page's one rich moment: switch levels and the kite climbs to that height while
 * the panel shows the tutor style, projects, assessment and courses for it. The rest stays on quiet hairlines.
 */

const STEPS = [
  { title: "Pick it when you sign up", text: "Choose School, College or University. Lessons, tests and the tutor follow it." },
  { title: "Take the skill assessment", text: "Your results can recommend a different level if another one fits better." },
  { title: "Change it any time", text: "Switch levels in Settings whenever you need to." },
];

export default function LevelsPage() {
  return (
    <>
      <PageIntro label="Learning levels" title="Three levels, each with its own lessons, tutor and projects">
        Class 6 to university. See what each level teaches, how the tutor talks to you and how you&apos;re tested.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <LevelExplorer />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.6fr] lg:gap-16">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">How your level is set</h2>
          <ol className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <ScrollReveal y={12} blur={0} duration={0.5} delay={i * 0.06} className="h-full border-t border-line pt-5">
                  <span className="font-mono text-xs text-muted tabular-nums">0{i + 1}</span>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-col gap-6 rounded-[24px] border border-line bg-card p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start where you are</h2>
            <p className="mt-2 text-muted">Creating an account and learning is free.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/register" size="lg" className="transition-[background-color,transform] active:scale-[0.97]">
              Choose my level <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/programs" size="lg" variant="secondary">
              See the programs
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
