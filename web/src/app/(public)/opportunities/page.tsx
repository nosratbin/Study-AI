import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { AnimatedBadge } from "@/components/beui/animated-badge";
import { ScrollReveal } from "@/components/beui/scroll-reveal";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/vengeance/empty";
import TextAnimation from "@/components/vengeance/staggerText";
import { ListingBlueprint } from "@/components/opportunities-public/listing-blueprint";

export const metadata: Metadata = { title: "Opportunities" };

/*
 * Public Opportunity Hub page. Listings themselves are student-only (the API serves verified rows to signed-in students),
 * so this page explains what we list and how a listing gets checked, and never shows a sample listing. The blueprint
 * card is the one rich moment: the real card's layout with field names where values would be.
 */

const CATEGORY_GROUPS = [
  {
    name: "Scholarships and funding",
    items: ["Government scholarships", "Private scholarships", "Merit-based scholarships", "Financial assistance and stipends"],
  },
  {
    name: "Competitions",
    items: ["National competitions", "International competitions", "Hackathons", "AI Olympiads", "Cultural competitions", "Sports competitions"],
  },
  { name: "Research, work and study", items: ["Research opportunities", "Internships", "Study abroad"] },
];

const STEPS = [
  {
    title: "Added with its official link",
    text: "An admin enters the provider, eligibility, deadline and documents, with the full https address of the official page.",
  },
  {
    title: "Checked against the source",
    text: "Someone on our team compares it with the official page and marks it verified. Until then, students can't see it.",
  },
  {
    title: "Matched to you",
    text: "The matcher ranks verified listings by your level, interests and assessment results. It follows fixed rules and never writes listing details.",
  },
  { title: "Checked again after any edit", text: "If a verified listing changes, it's hidden until someone checks it again." },
  { title: "A reminder before it closes", text: "Save a listing and you get a reminder when the deadline is three days away." },
];

export default function OpportunitiesPage() {
  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 lg:pt-24 lg:pb-20">
        <AnimatedBadge status="success" size="sm">
          Verified by our team
        </AnimatedBadge>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
          <TextAnimation>Scholarships and competitions,</TextAnimation>{" "}
          <span className="text-brand-600">
            <TextAnimation delay={0.15}>checked before you see them</TextAnimation>
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted animate-rise [animation-delay:160ms]">
          Every listing links to its official source, and our team checks it before it appears. We never publish a deadline we
          haven&apos;t confirmed.
        </p>
      </header>

      {/* ---------- What we list ---------- */}
      <section aria-labelledby="categories" className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_2fr] lg:gap-16 lg:py-20">
          <div>
            <h2 id="categories" className="text-3xl font-semibold tracking-tight">
              What we list
            </h2>
            <p className="mt-3 max-w-xs text-muted">Money for your studies, competitions to enter, and ways to research, work or study abroad.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {CATEGORY_GROUPS.map((g, i) => (
              <ScrollReveal key={g.name} y={12} blur={0} duration={0.5} delay={i * 0.06}>
                <h3 className="text-sm font-medium text-muted">{g.name}</h3>
                <ul className="mt-3">
                  {g.items.map((c) => (
                    <li key={c} className="border-t border-line py-2.5 text-[15px]">
                      {c}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How a listing gets checked ---------- */}
      <section aria-labelledby="how" className="border-y border-line bg-card/60">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h2 id="how" className="text-3xl font-semibold tracking-tight text-balance">
              How a listing reaches you
            </h2>
            <ol className="relative mt-10">
              <span className="absolute top-2 bottom-2 left-[4.5px] w-px bg-line" aria-hidden />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative grid grid-cols-[10px_1fr] gap-x-5 pb-7 last:pb-0">
                  <span
                    className={`mt-[7px] size-2.5 rotate-45 rounded-[2px] border ${i === 1 ? "border-brand-500 bg-brand-500" : "border-line bg-card"}`}
                    aria-hidden
                  />
                  <div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <ScrollReveal y={16} blur={0} duration={0.6} amount={0.25}>
            <ListingBlueprint />
          </ScrollReveal>
        </div>
      </section>

      {/* ---------- Status ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <ScrollReveal y={12} blur={0} duration={0.5}>
          <Empty className="rounded-[24px] border border-solid border-line bg-card px-6 py-14 md:py-16">
            <EmptyHeader className="max-w-md">
              <EmptyMedia>
                {/* eslint-disable-next-line @next/next/no-img-element -- static brand vector */}
                <img src="/brand/iccheghuri-symbol.svg" alt="" width={256} height={256} className="h-auto w-14 -rotate-6" aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="text-2xl font-semibold text-ink">Verified listings are being prepared</EmptyTitle>
              <EmptyDescription className="text-[15px] text-muted">
                Our team is checking opportunities against their official sources. Create an account to get matched and reminded
                when they&apos;re published.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-none flex-row flex-wrap justify-center gap-3">
              <ButtonLink href="/register" size="lg" className="transition-[background-color,transform] active:scale-[0.97]">
                Create free account <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/login" size="lg" variant="ghost">
                Log in
              </ButtonLink>
            </EmptyContent>
          </Empty>
        </ScrollReveal>
      </section>
    </>
  );
}
