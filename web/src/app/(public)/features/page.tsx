import type { Metadata } from "next";
import { FeatureGrid, PageHeader, Section } from "@/components/marketing";

export const metadata: Metadata = { title: "Features" };

export default function FeaturesPage() {
  return (
    <>
      <PageHeader eyebrow="Features" title="Built around how students actually learn and grow">
        AI-assisted learning with human oversight: teachers and mentors create content and review projects, and admins verify
        every opportunity.
      </PageHeader>
      <Section>
        <FeatureGrid />
      </Section>
    </>
  );
}
