import Link from "next/link";
import clsx from "clsx";
import { BadgeCheck, Bookmark, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui";
import { APPLICATION_LABELS, formatDeadline, levelLabel, type Opportunity } from "@/lib/types";

export function DeadlineText({ o, className }: { o: Opportunity; className?: string }) {
  if (!o.deadline) return <span className={clsx("text-muted", className)}>Rolling deadline / not announced</span>;
  const urgent = !o.is_closed && o.days_left !== null && o.days_left <= 7;
  return (
    <span className={clsx(o.is_closed ? "text-muted line-through" : urgent ? "font-semibold text-danger" : "text-ink", className)}>
      {formatDeadline(o.deadline)}
      {!o.is_closed && o.days_left !== null && (
        <span className="ml-1 no-underline">· {o.days_left === 0 ? "closes today" : `${o.days_left} day${o.days_left === 1 ? "" : "s"} left`}</span>
      )}
      {o.is_closed && <span className="ml-1">· closed</span>}
    </span>
  );
}

export function OpportunityCard({ o, reasons }: { o: Opportunity; reasons?: string[] }) {
  return (
    <article className="group relative flex flex-col gap-3 rounded-card border border-line bg-card p-5 transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-brand-500/40">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{o.category_label}</Badge>
        <Badge tone="success">
          <BadgeCheck className="size-3.5" aria-hidden /> Verified
        </Badge>
        {o.saved && (
          <span className="ml-auto text-brand-600" title="Saved">
            <Bookmark className="size-4 fill-current" aria-hidden />
            <span className="sr-only">Saved</span>
          </span>
        )}
      </div>
      <div>
        <h3 className="font-semibold leading-snug">
          <Link href={`/opportunities-hub/${o.id}`} className="after:absolute after:inset-0 focus:outline-none">
            {o.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-muted">{o.provider}</p>
      </div>
      <p className="flex items-start gap-2 text-sm">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <DeadlineText o={o} />
      </p>
      <p className="text-xs text-muted">
        {o.education_levels.length ? o.education_levels.map((l) => levelLabel(l)).join(", ") : "All education levels"}
      </p>
      {reasons && reasons.length > 0 && (
        <ul className="space-y-1 border-t border-line pt-3 text-xs text-muted">
          {reasons.slice(0, 3).map((r) => (
            <li key={r} className="flex gap-1.5">
              <span className="text-brand-600" aria-hidden>•</span> {r}
            </li>
          ))}
        </ul>
      )}
      {o.application && (
        <p className="mt-auto text-xs font-medium text-brand-700">Your status: {APPLICATION_LABELS[o.application.status]}</p>
      )}
    </article>
  );
}
