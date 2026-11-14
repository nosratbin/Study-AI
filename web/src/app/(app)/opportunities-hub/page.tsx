"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Search, ShieldCheck, Trophy } from "lucide-react";
import { EmptyState, Input, LoadError, PageHeader, Select } from "@/components/ui";
import { Skeleton } from "@/components/vengeance/skeleton";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { useApi } from "@/lib/use-api";
import {
  APPLICATION_LABELS,
  CATEGORY_OPTIONS,
  LEVELS,
  type Opportunity,
  type OpportunityMatch,
  type TrackedApplication,
} from "@/lib/types";

type Tab = "match" | "all" | "saved" | "applications";
const TABS: { value: Tab; label: string }[] = [
  { value: "match", label: "For you" },
  { value: "all", label: "All" },
  { value: "saved", label: "Saved" },
  { value: "applications", label: "My applications" },
];

export default function OpportunitiesPage() {
  const [tab, setTab] = useState<Tab>("match");

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Opportunity Hub"
        subtitle="Scholarships, competitions, olympiads, internships and more. Every listing is checked by our team against the official source."
      />

      <p className="flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Only verified opportunities appear here. Always confirm the details and deadline on the official website before you apply.
        </span>
      </p>

      <div role="group" aria-label="Opportunity views" className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t.value}
            aria-pressed={tab === t.value}
            onClick={() => setTab(t.value)}
            className={clsx(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.value ? "bg-card text-brand-700 shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "match" && <MatchTab onBrowse={() => setTab("all")} />}
      {tab === "all" && <AllTab />}
      {tab === "saved" && <SavedTab onBrowse={() => setTab("all")} />}
      {tab === "applications" && <ApplicationsTab onBrowse={() => setTab("all")} />}
    </div>
  );
}

function Loading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-52 rounded-card bg-brand-50" />
      ))}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function NoneYet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <EmptyState icon={<Trophy className="size-7" />} title={title}>
      {children}
    </EmptyState>
  );
}

function BrowseLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="font-medium text-brand-600 underline-offset-2 hover:underline">
      Browse all opportunities
    </button>
  );
}

function MatchTab({ onBrowse }: { onBrowse: () => void }) {
  const { data, error, reload } = useApi<OpportunityMatch[]>("/opportunities/match");
  if (error) return <LoadError message={error.message} onRetry={reload} />;
  if (!data) return <Loading />;
  if (!data.length)
    return (
      <NoneYet title="No open opportunities match you right now">
        New opportunities are added as our team verifies them. <BrowseLink onClick={onBrowse} />.
      </NoneYet>
    );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Ranked by your education level, interests and assessment results.</p>
      <Grid>
        {data.map((m) => (
          <OpportunityCard key={m.opportunity.id} o={m.opportunity} reasons={m.reasons} />
        ))}
      </Grid>
    </div>
  );
}

function AllTab() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced copy of q, so typing doesn't fire a request per key
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [closed, setClosed] = useState(false);
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (level) params.set("level", level);
  if (closed) params.set("include_closed", "true");
  const qs = params.toString();
  const { data, error, reload } = useApi<Opportunity[]>(`/opportunities${qs ? `?${qs}` : ""}`);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <label className="relative block">
          <span className="sr-only">Search opportunities</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or provider" maxLength={100} className="pl-9" />
        </label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Education level">
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} className="size-4 accent-brand-500" />
        Show closed opportunities
      </label>

      {error ? (
        <LoadError message={error.message} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : data.length ? (
        <Grid>
          {data.map((o) => (
            <OpportunityCard key={o.id} o={o} />
          ))}
        </Grid>
      ) : (
        <NoneYet title={qs ? "Nothing matches these filters" : "No verified opportunities yet"}>
          {qs ? "Try a different search or category." : "Our team adds opportunities only after checking the official source. Check back soon."}
        </NoneYet>
      )}
    </div>
  );
}

function SavedTab({ onBrowse }: { onBrowse: () => void }) {
  const { data, error, reload } = useApi<Opportunity[]>("/opportunities/saved");
  if (error) return <LoadError message={error.message} onRetry={reload} />;
  if (!data) return <Loading />;
  if (!data.length)
    return (
      <NoneYet title="You haven't saved anything yet">
        Save opportunities to keep their deadlines on your dashboard. <BrowseLink onClick={onBrowse} />.
      </NoneYet>
    );
  return (
    <Grid>
      {data.map((o) => (
        <OpportunityCard key={o.id} o={o} />
      ))}
    </Grid>
  );
}

function ApplicationsTab({ onBrowse }: { onBrowse: () => void }) {
  const { data, error, reload } = useApi<TrackedApplication[]>("/opportunities/applications");
  if (error) return <LoadError message={error.message} onRetry={reload} />;
  if (!data) return <Loading />;
  if (!data.length)
    return (
      <NoneYet title="No applications tracked yet">
        Open an opportunity and set your status to keep track of where you&apos;ve applied. <BrowseLink onClick={onBrowse} />.
      </NoneYet>
    );
  const counts = data.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.application.status]: (acc[t.application.status] ?? 0) + 1 }), {});
  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(APPLICATION_LABELS) as (keyof typeof APPLICATION_LABELS)[]).map((s) => (
          <li key={s} className="rounded-full bg-surface px-3 py-1 text-muted">
            {APPLICATION_LABELS[s]}: <span className="font-semibold text-ink">{counts[s] ?? 0}</span>
          </li>
        ))}
      </ul>
      <Grid>
        {data.map((t) => (
          <OpportunityCard key={t.opportunity.id} o={t.opportunity} />
        ))}
      </Grid>
    </div>
  );
}
