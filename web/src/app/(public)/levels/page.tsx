import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/marketing";
import { ButtonLink } from "@/components/ui";
import { LEVELS } from "@/lib/types";

export const metadata: Metadata = { title: "Learning levels" };

const DETAILS: Record<string, { tutor: string; projects: string; assessment: string }> = {
  school: {
    tutor: "Simple language, everyday examples, short steps and lots of encouragement.",
    projects: "Visual, unplugged and block-style activities; first Python lines.",
    assessment: "Short concept checks on logic and AI basics.",
  },
  college: {
    tutor: "Clear technical vocabulary with worked examples and code snippets.",
    projects: "Guided Colab notebooks: data cleaning, simple classifiers.",
    assessment: "Python and AI fundamentals topic tests.",
  },
  university: {
    tutor: "Rigorous explanations, maths where useful, references and trade-offs.",
    projects: "End-to-end ML/DL projects suitable for a portfolio.",
    assessment: "ML, DL and applied problem-solving tests.",
  },
};

export default function LevelsPage() {
  return (
    <>
      <PageHeader eyebrow="Learning levels" title="Three levels, each with its own content, tutor style and projects">
        Pick your level when you sign up. Your skill assessment can recommend a different level, and you can change it any
        time in Settings.
      </PageHeader>
      <Section>
        <div className="grid gap-4 lg:grid-cols-3">
          {LEVELS.map((l) => (
            <div key={l.value} className="rounded-card border border-line bg-white p-6 shadow-card">
              <p className="text-sm font-medium text-brand-600">{l.tag}</p>
              <h2 className="mt-1 text-xl font-semibold">{l.label}</h2>
              <p className="mt-2 text-sm text-muted">{l.blurb}</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div><dt className="font-medium">AI Tutor</dt><dd className="text-muted">{DETAILS[l.value].tutor}</dd></div>
                <div><dt className="font-medium">Projects</dt><dd className="text-muted">{DETAILS[l.value].projects}</dd></div>
                <div><dt className="font-medium">Assessment</dt><dd className="text-muted">{DETAILS[l.value].assessment}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <ButtonLink href="/register">Choose my level</ButtonLink>
        </div>
      </Section>
    </>
  );
}
