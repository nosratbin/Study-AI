import Link from "next/link";
import type { ReactNode } from "react";
import { SharedLayoutBg } from "@/components/beui/shared-layout-bg";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Privacy policy and terms: a contents list, then numbered sections capped at a readable line length. */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <article className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:pt-20 lg:pb-24">
      <header className="max-w-[65ch] border-b border-line pb-8">
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-balance sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-6 space-y-4 text-lg leading-relaxed text-pretty text-muted">{intro}</div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <nav aria-labelledby="legal-contents" className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="legal-contents" className="text-sm font-medium text-ink">
            Contents
          </h2>
          {/* Same hover pill as the footer and top nav. */}
          <SharedLayoutBg as="ul" inset={8} className="mt-3 w-fit gap-0.5" pillClassName="rounded-lg bg-muted-bg">
            {sections.map((s, i) => (
              <li key={s.id}>
                <Link href={`#${s.id}`} className="block py-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink">
                  {i + 1}. {s.title}
                </Link>
              </li>
            ))}
          </SharedLayoutBg>
        </nav>

        <div className="max-w-[65ch] space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
              <h2 id={`${s.id}-title`} className="text-xl font-semibold tracking-tight text-balance">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-pretty break-words text-muted [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_li]:pl-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
