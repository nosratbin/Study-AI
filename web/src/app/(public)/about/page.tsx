import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { ScrollReveal } from "@/components/beui/scroll-reveal";

export const metadata: Metadata = { title: "About" };

/*
 * About: what IccheGhuri is for, then the four principles as a ruled list with margin numbers (the page's one rich
 * moment). The hero is an asymmetric split, headline left and intro right, so the first screen has no empty half.
 */

const PRINCIPLES = [
  { title: "Open to every student", text: "It's free to start, works on low-end Android phones and supports Bangla alongside English." },
  { title: "Built for your level", text: "School, college and university students get different content, explanations and project difficulty." },
  {
    title: "Verified scores and listings",
    text: "We score assessments from verified answer keys, and we list an opportunity only after our team has verified it by hand.",
  },
  {
    title: "Safe and private",
    text: "We collect as little personal data as we can, ask for guardian consent for minors, and keep well-being data separate from academics.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-16 pb-16 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-16 lg:pt-24 lg:pb-20">
          <h1 className="animate-rise text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
            Making quality AI education accessible to every student in Bangladesh
          </h1>
          <p className="max-w-md animate-rise text-lg leading-relaxed text-muted [animation-delay:80ms]">
            IccheGhuri brings AI education, personalised learning, well-being support and verified opportunities together in one place, so a
            student in any district gets the same start as one in Dhaka.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6 lg:pt-24 lg:pb-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.6fr] lg:gap-16">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:sticky lg:top-24 lg:self-start">What we stand for</h2>
          <ol className="border-b border-line">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title}>
                <ScrollReveal y={12} blur={0} duration={0.45} delay={i * 0.06} amount={0.4}>
                  <div className="grid gap-2 border-t border-line py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
                    <h3 className="flex items-baseline gap-3 font-semibold">
                      <span aria-hidden className="w-6 shrink-0 text-sm font-medium tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                      {p.title}
                    </h3>
                    <p className="pl-9 leading-relaxed text-muted sm:pl-0">{p.text}</p>
                  </div>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-24">
        <div className="flex flex-col gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Start at your level</h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/register" className="transition-[background-color,transform] active:scale-[0.97]">
              Get started <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Contact us
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
