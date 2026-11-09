import { ArrowRight, GraduationCap, School, University } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { FeatureGrid, Section } from "@/components/marketing";
import { LEVELS } from "@/lib/types";

const LEVEL_ICONS = { school: School, college: GraduationCap, university: University };

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              National AI education ecosystem · Bangladesh
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Learn, Innovate, <span className="text-brand-500">Grow &amp; Thrive</span> with AI.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Quality AI education, personal development and verified opportunities for every student in Bangladesh — from
              Class 6 to university.
            </p>
            <p lang="bn" className="mt-2 text-muted">
              বাংলা ও ইংরেজিতে শিখুন — আপনার স্তর অনুযায়ী।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/register" size="lg">
                Start learning free <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/programs" size="lg" variant="secondary">
                Explore programs
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-3">
            {LEVELS.map((l) => {
              const Icon = LEVEL_ICONS[l.value];
              return (
                <div key={l.value} className="flex items-start gap-4 rounded-card border border-line bg-surface p-5">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-card">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {l.label} <span className="ml-1 text-sm font-medium text-brand-600">{l.tag}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">{l.blurb}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Section>
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">One platform for learning and growth</h2>
          <p className="mt-2 text-muted">Everything a student needs to learn AI, build real projects and find the next opportunity.</p>
        </div>
        <FeatureGrid />
      </Section>

      <Section className="pt-0">
        <div className="flex flex-col items-start justify-between gap-6 rounded-card bg-ink p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold">Ready to start your AI journey?</h2>
            <p className="mt-1 text-white/70">Create a free account, pick your level and get a personalised path.</p>
          </div>
          <ButtonLink href="/register" size="lg">
            Create account
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
