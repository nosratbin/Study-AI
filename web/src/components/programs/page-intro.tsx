import type { ReactNode } from "react";
import TextAnimation from "@/components/vengeance/staggerText";

/** The quiet opening shared by Programs and Learning levels: a sentence-case label, the headline, one paragraph. */
export function PageIntro({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 lg:pt-24 lg:pb-16">
      <p className="text-sm font-medium text-brand-600 animate-rise">{label}</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-balance sm:text-5xl">
        <TextAnimation>{title}</TextAnimation>
      </h1>
      <div className="mt-5 max-w-2xl text-lg leading-relaxed text-muted animate-rise [animation-delay:160ms]">{children}</div>
    </header>
  );
}
