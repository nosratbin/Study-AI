import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = { title: "Contact" };

const HINTS = ["Your school or organisation", "The class or level of the students you work with", "What you'd like to do together"];

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-6xl items-start gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:pt-20 lg:pb-24">
      <div className="lg:pt-6">
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-balance sm:text-5xl">Write to the IccheGhuri team</h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
          Schools, teachers, mentors and partners: send us a message and we&apos;ll get back to you.
        </p>
        <div className="mt-10 max-w-md border-t border-line pt-6">
          <h2 className="font-semibold">It helps to mention</h2>
          <ul className="mt-3 space-y-2 text-muted">
            {HINTS.map((h) => (
              <li key={h} className="flex items-baseline gap-3">
                <span className="size-1.5 shrink-0 translate-y-[-2px] rotate-45 bg-brand-500" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="animate-rise [animation-delay:120ms]">
        <ContactForm />
      </div>
    </section>
  );
}
