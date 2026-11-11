import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/marketing";

export const metadata: Metadata = { title: "About" };

const PRINCIPLES = [
  { title: "Accessible to every student", text: "Free to start, works on low-end Android phones and supports Bangla alongside English." },
  { title: "Level-appropriate", text: "School, college and university students get different content, explanations and project difficulty." },
  { title: "Trustworthy", text: "Assessments are scored from verified answer keys. Opportunities are listed only after manual verification." },
  { title: "Safe and private", text: "Minimal personal data, guardian consent for minors, and well-being data kept separate from academics." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="Making quality AI education accessible to every student in Bangladesh">
        IccheGhuri brings AI education, personalised learning, well-being support and verified opportunities together in one
        place — so a student in any district has the same start as one in Dhaka.
      </PageHeader>
      <Section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">What we stand for</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-card border border-line bg-white p-6 shadow-card">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm text-muted">
          IccheGhuri is being developed for the AI Builders Congress at Daffodil International University (DIU). This is an MVP;
          features are rolling out in phases.
        </p>
      </Section>
    </>
  );
}
