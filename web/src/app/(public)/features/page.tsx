import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { ScrollReveal } from "@/components/beui/scroll-reveal";
import TextAnimation from "@/components/vengeance/staggerText";
import { ModuleIndex } from "@/components/features/module-index";
import { MODULE_GROUPS } from "@/components/features/modules";

export const metadata: Metadata = { title: "Features" };

/*
 * Features: the home page shows the nine modules as a board; this page goes one level deeper. Each module says what a
 * student can do with it and the rule the code enforces behind it. The kite-string index on the left is the one rich
 * moment; the module sections stay on quiet hairlines. Motion here is Motion only (staggerText, ScrollReveal), no GSAP.
 */

export default function FeaturesPage() {
  const index = MODULE_GROUPS.map((g) => ({ name: g.name, modules: g.modules.map(({ id, title }) => ({ id, title })) }));

  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 lg:pt-24 lg:pb-16">
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
          <TextAnimation>Nine modules and</TextAnimation>{" "}
          <span className="text-brand-600">
            <TextAnimation delay={0.15}>the rules behind them</TextAnimation>
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted animate-rise [animation-delay:160ms]">
          One account covers all nine. The AI explains and suggests. People write the lessons, review the projects and check
          every opportunity before students see it.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:grid lg:grid-cols-[208px_1fr] lg:gap-16 lg:pb-28">
        <ModuleIndex groups={index} />

        <div>
          {MODULE_GROUPS.map((group) => (
            <section key={group.name} aria-labelledby={`group-${group.name}`} className="mt-12 first:mt-0">
              <h2 id={`group-${group.name}`} className="border-b border-line pb-3 text-sm font-medium text-muted">
                {group.name}
              </h2>
              {group.modules.map(({ id, icon: Icon, title, text, points, rule }) => (
                <article key={id} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-b border-line py-10 last:border-b-0 sm:py-12">
                  <ScrollReveal y={12} blur={0} duration={0.5} amount={0.15}>
                    <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-10">
                      <div>
                        <Icon className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
                        <h3 id={`${id}-title`} className="mt-4 text-2xl font-semibold tracking-tight">
                          {title}
                        </h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
                        <ul className="mt-6 space-y-3">
                          {points.map((p) => (
                            <li key={p} className="flex gap-3 text-[15px] leading-relaxed">
                              <span className="mt-[9px] size-1.5 shrink-0 rotate-45 rounded-[1px] bg-muted/50" aria-hidden />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <aside aria-label={`The rule behind ${title}`} className="self-start rounded-2xl border border-line bg-card p-6">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <ShieldCheck className="size-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                          The rule behind it
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-muted">{rule}</p>
                      </aside>
                    </div>
                  </ScrollReveal>
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>

      <section className="border-t border-line bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between lg:py-20">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Start at your level</h2>
            <p className="mt-3 text-muted">Free to join. Choose school, college or university when you sign up.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/register" size="lg" className="transition-[background-color,transform] active:scale-[0.97]">
              Get started <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/levels" size="lg" variant="secondary" className="transition-[background-color,transform] active:scale-[0.97]">
              Compare the levels
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
