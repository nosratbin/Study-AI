import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Badge, ButtonLink } from "@/components/ui";
import { ScrollReveal } from "@/components/beui/scroll-reveal";
import { PageIntro } from "@/components/programs/page-intro";
import { RoadmapRail } from "@/components/programs/roadmap-rail";
import { DEMO_COURSES, PROGRAMS, STAGES, hours } from "@/components/programs/curriculum";

export const metadata: Metadata = { title: "Programs" };

/*
 * Programs. The roadmap rail is the page's one rich moment: the string climbs through the five stages to the brand
 * kite, and the map under it shows which stages each program teaches. The program list below stays on quiet hairlines.
 */

function Knot({ className = "" }: { className?: string }) {
  return <span className={`mt-[7px] size-1.5 shrink-0 rotate-45 rounded-[1px] border border-ink/50 ${className}`} aria-hidden />;
}

export default function ProgramsPage() {
  return (
    <>
      <PageIntro label="Programs" title="From your first line of code to real AI projects">
        Every program follows one roadmap: Python, AI fundamentals, machine learning, deep learning, then project development.
        Your level decides where you start and how deep each stage goes.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal y={12} blur={0} duration={0.5} amount={0.2}>
          <RoadmapRail />
        </ScrollReveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The programs</h2>
        <div className="mt-10 border-b border-line">
          {PROGRAMS.map((p, i) => {
            const courses = p.tone ? DEMO_COURSES[p.tone] : [];
            const stages = STAGES.filter((s) => p.cells[s.id]).map((s) => s.name);
            return (
              <ScrollReveal key={p.name} y={12} blur={0} duration={0.5} delay={i * 0.06} amount={0.3}>
                <article className="grid gap-6 border-t border-line py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
                  <div>
                    <p className="text-sm font-medium text-brand-600">
                      {p.level} · {p.stage}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight">{p.name}</h3>
                    {stages.length > 0 && <p className="mt-2 text-sm text-muted md:hidden">Stages: {stages.join(", ")}</p>}
                  </div>

                  <ul className="space-y-2.5">
                    {p.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-snug">
                        <Knot />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="md:col-start-2 lg:col-start-auto">
                    {courses.length > 0 ? (
                      <>
                        <p className="flex items-center gap-2 text-sm text-muted">
                          In the Learning Center <Badge>Demo</Badge>
                        </p>
                        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                          {courses.map((c) => (
                            <li key={c.title} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
                              <span className="font-medium">{c.title}</span>
                              <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{hours(c.hours)}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted">Open to every student, at every level</p>
                        <div className="mt-3 flex flex-col items-start gap-1">
                          <ButtonLink href="/opportunities" variant="ghost" size="sm" className="-ml-3">
                            Verified opportunities <ArrowRight className="size-4" aria-hidden />
                          </ButtonLink>
                          <ButtonLink href="/features" variant="ghost" size="sm" className="-ml-3">
                            All modules <ArrowRight className="size-4" aria-hidden />
                          </ButtonLink>
                        </div>
                      </>
                    )}
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-col gap-6 rounded-[24px] border border-line bg-card p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Not sure where to start</h2>
            <p className="mt-2 text-muted">Pick your level when you sign up. The skill assessment can recommend a different one, and you can switch any time.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/register" size="lg" className="transition-[background-color,transform] active:scale-[0.97]">
              Find my program <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/levels" size="lg" variant="secondary">
              Compare the levels
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
