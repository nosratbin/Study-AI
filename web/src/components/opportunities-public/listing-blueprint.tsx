import type { ReactNode } from "react";
import clsx from "clsx";
import { BadgeCheck, CalendarClock, ExternalLink, FileCheck2, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui";

/**
 * A blueprint of a verified listing, laid out like the real OpportunityCard and detail page but with the field names
 * in place of values. It shows the data shape students get after sign-up without inventing a scholarship: no title,
 * provider, date or link here is real, because none is filled in.
 */

function Slot({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx("inline-block rounded-md border border-dashed border-line px-2 py-0.5 text-muted", className)}>{children}</span>;
}

function Row({ icon: Icon, children }: { icon: typeof CalendarClock; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-sm">
      <Icon className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
      {children}
    </p>
  );
}

export function ListingBlueprint() {
  return (
    <figure className="relative">
      <div className="rounded-[28px] border border-line bg-surface p-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Slot>Category</Slot>
            <Badge tone="success">
              <BadgeCheck className="size-3.5" aria-hidden /> Verified
            </Badge>
          </div>
          <div className="space-y-2">
            <Slot className="text-base font-semibold">Title, as the provider writes it</Slot>
            <div>
              <Slot className="text-sm">Provider</Slot>
            </div>
          </div>
          <div className="space-y-2.5 border-t border-line pt-4">
            <Row icon={CalendarClock}>
              <Slot className="text-sm">Deadline, or &ldquo;Rolling deadline / not announced&rdquo;</Slot>
            </Row>
            <Row icon={GraduationCap}>
              <Slot className="text-sm">School, college, university or all levels</Slot>
            </Row>
            <Row icon={FileCheck2}>
              <Slot className="text-sm">Eligibility and required documents</Slot>
            </Row>
          </div>
          <p className="flex items-center gap-2 text-sm font-medium text-brand-600">
            Official https link <ExternalLink className="size-3.5" aria-hidden />
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-muted">
        The fields every verified listing carries. You see the details after you sign in.
      </figcaption>
    </figure>
  );
}
