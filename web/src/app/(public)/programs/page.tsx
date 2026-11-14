import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHeader, Section } from "@/components/marketing";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Programs" };

const PROGRAMS = [
  {
    name: "AI Foundations",
    level: "School · Beginner",
    items: ["What is AI and where we use it", "Logical thinking and first steps in coding", "Using AI responsibly and safely"],
  },
  {
    name: "Python & AI Fundamentals",
    level: "College · Intermediate",
    items: ["Python fundamentals", "Data, features and labels", "Supervised vs unsupervised learning", "Mini projects in Google Colab"],
  },
  {
    name: "Applied Machine Learning",
    level: "University · Professional",
    items: ["scikit-learn pipelines and validation", "Deep learning foundations", "Portfolio-grade AI projects", "Mentorship and research pathways"],
  },
  {
    name: "Growth & Opportunities",
    level: "All levels",
    items: ["Verified scholarships, stipends and competitions", "Career Navigator and soft skills", "Skill Passport to showcase achievements", "MindCare well-being support"],
  },
];

export default function ProgramsPage() {
  return (
    <>
      <PageHeader eyebrow="Programs" title="Structured learning paths from first steps to real AI projects">
        Each program follows the roadmap Python → AI Fundamentals → Machine Learning → Deep Learning → Project Development,
        adapted to your level.
      </PageHeader>
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          {PROGRAMS.map((p) => (
            <div key={p.name} className="rounded-card border border-line bg-card p-6 shadow-card">
              <p className="text-sm font-medium text-brand-600">{p.level}</p>
              <h2 className="mt-1 text-xl font-semibold">{p.name}</h2>
              <ul className="mt-4 space-y-2">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <ButtonLink href="/register">Find my program</ButtonLink>
        </div>
      </Section>
    </>
  );
}
