import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHeader, Section } from "@/components/marketing";
import { ButtonLink, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Opportunities" };

const CATEGORIES = [
  "Government scholarships", "Private scholarships", "Merit-based scholarships", "Financial assistance & stipends",
  "National competitions", "International competitions", "Hackathons", "AI Olympiads", "Cultural competitions",
  "Sports competitions", "Research opportunities", "Internships", "Study abroad",
];

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader eyebrow="Opportunity Hub" title="Verified scholarships, competitions and programs in one place">
        Every listing links to the official source and is checked by our team before it appears. We never publish
        unconfirmed deadlines.
      </PageHeader>
      <Section>
        <h2 className="mb-4 text-lg font-semibold">Categories</h2>
        <ul className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <li key={c} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-muted">
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <EmptyState icon={<ShieldCheck className="size-8" />} title="Verified listings are being prepared">
            Our team is reviewing opportunities against official sources. Create an account to get matched and reminded as
            soon as they are published.
          </EmptyState>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/register">Create free account</ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
