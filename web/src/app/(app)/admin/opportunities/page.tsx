"use client";

import { useState } from "react";
import clsx from "clsx";
import { ExternalLink, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadError, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  CATEGORY_OPTIONS,
  LEVELS,
  formatDeadline,
  type AdminOpportunity,
  type EducationLevel,
  type OpportunityCategory,
  type VerificationStatus,
} from "@/lib/types";

type Filter = VerificationStatus | "all";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "unverified", label: "Needs review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_BADGE: Record<VerificationStatus, { tone: "brand" | "success" | "neutral"; label: string }> = {
  unverified: { tone: "brand", label: "Needs review" },
  verified: { tone: "success", label: "Verified · visible to students" },
  rejected: { tone: "neutral", label: "Rejected" },
};

export default function AdminOpportunitiesPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin")
    return (
      <EmptyState icon={<ShieldAlert className="size-7" />} title="Admins only">
        This page is for LEARN AI administrators.
      </EmptyState>
    );
  return <AdminOpportunities />;
}

function AdminOpportunities() {
  const [filter, setFilter] = useState<Filter>("unverified");
  const list = useApi<AdminOpportunity[]>(`/admin/opportunities${filter === "all" ? "" : `?status=${filter}`}`);
  const [editing, setEditing] = useState<AdminOpportunity | "new" | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  function saved(o: AdminOpportunity) {
    setEditing(null);
    setReviewing(o.verification_status === "verified" ? null : o.id);
    if (filter !== "unverified" && filter !== "all") setFilter("unverified");
    else list.reload();
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Verify opportunities" subtitle="Students only see opportunities marked verified. Check every detail against the official source first.">
        {!editing && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> Add opportunity
          </Button>
        )}
      </PageHeader>

      {editing && <Editor key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={saved} />}

      <div role="group" aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 sm:inline-flex">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={clsx("whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium", filter === f.value ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.error ? (
        <LoadError message={list.error.message} onRetry={list.reload} />
      ) : !list.data ? (
        <Spinner />
      ) : !list.data.length ? (
        <EmptyState icon={<ShieldCheck className="size-7" />} title="Nothing here">
          {filter === "unverified" ? "No opportunities are waiting for review." : "No opportunities with this status."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.data.map((o) => (
            <li key={o.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={STATUS_BADGE[o.verification_status].tone}>{STATUS_BADGE[o.verification_status].label}</Badge>
                      <Badge>{o.category_label}</Badge>
                    </div>
                    <h2 className="mt-2 font-semibold">{o.title}</h2>
                    <p className="text-sm text-muted">
                      {o.provider} · {o.deadline ? `Deadline ${formatDeadline(o.deadline)}` : "No deadline"} · saved by {o.saved_count}
                    </p>
                    <a href={o.official_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-sm text-brand-600 hover:underline">
                      {o.official_url} <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    </a>
                    {o.verified_by_name && o.verified_at && (
                      <p className="mt-1 text-xs text-muted">
                        Verified by {o.verified_by_name} on {formatDeadline(o.verified_at)}
                      </p>
                    )}
                    {o.source_note && <p className="mt-1 text-xs text-muted">Source note: {o.source_note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { setReviewing(null); setEditing(o); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant={o.verification_status === "verified" ? "ghost" : "primary"} onClick={() => setReviewing(reviewing === o.id ? null : o.id)}>
                      {o.verification_status === "verified" ? "Re-review" : "Review"}
                    </Button>
                  </div>
                </div>
                {reviewing === o.id && <Review o={o} onDone={() => { setReviewing(null); list.reload(); }} />}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Review({ o, onDone }: { o: AdminOpportunity; onDone: () => void }) {
  const [note, setNote] = useState(o.source_note ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: "verified" | "rejected") {
    if (status === "verified" && note.trim().length < 10) {
      setError("Say where you confirmed the details (official page, notice, date checked) before verifying.");
      return;
    }
    setBusy(status);
    setError(null);
    try {
      await api(`/admin/opportunities/${o.id}/verify`, { method: "POST", body: { status, source_note: note.trim() || null } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${o.title}"? Students who saved it will lose it.`)) return;
    setBusy("delete");
    try {
      await api(`/admin/opportunities/${o.id}`, { method: "DELETE" });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-surface p-4">
      <p className="text-sm">
        Before verifying, open the official link and confirm the title, provider, eligibility, deadline and documents match exactly.
      </p>
      <Field label="Where did you confirm it?" htmlFor={`note-${o.id}`} hint="e.g. Official notice on www.example.gov.bd, checked 10 Nov 2026">
        <Textarea id={`note-${o.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={busy === "verified"} disabled={!!busy} onClick={() => act("verified")}>
          <ShieldCheck className="size-4" aria-hidden /> Verify and publish
        </Button>
        <Button size="sm" variant="secondary" loading={busy === "rejected"} disabled={!!busy} onClick={() => act("rejected")}>
          Reject
        </Button>
        <Button size="sm" variant="danger" loading={busy === "delete"} disabled={!!busy} onClick={remove} className="ml-auto">
          Delete
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

/** Split an ISO instant into Bangladesh-time date and time strings for the inputs. */
function toDhaka(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function Editor({ initial, onCancel, onSaved }: { initial: AdminOpportunity | null; onCancel: () => void; onSaved: (o: AdminOpportunity) => void }) {
  const dl = toDhaka(initial?.deadline ?? null);
  const [f, setF] = useState({
    title: initial?.title ?? "",
    provider: initial?.provider ?? "",
    category: (initial?.category ?? "") as OpportunityCategory | "",
    description: initial?.description ?? "",
    eligibility: initial?.eligibility ?? "",
    levels: initial?.education_levels ?? ([] as EducationLevel[]),
    date: dl.date,
    time: dl.time || "23:59",
    documents: (initial?.required_documents ?? []).join("\n"),
    official_url: initial?.official_url ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.title.trim().length < 5) errs.title = "At least 5 characters.";
    if (f.provider.trim().length < 2) errs.provider = "Who runs it?";
    if (!f.category) errs.category = "Choose a category.";
    if (f.description.trim().length < 20) errs.description = "At least 20 characters.";
    if (f.eligibility.trim().length < 5) errs.eligibility = "Describe who can apply.";
    if (!/^https:\/\/[^\s@/]+\.[^\s@]+$/.test(f.official_url.trim())) errs.official_url = "Use the full official https:// link.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body = {
      title: f.title.trim(), provider: f.provider.trim(), category: f.category, description: f.description.trim(),
      eligibility: f.eligibility.trim(), education_levels: f.levels,
      deadline: f.date ? `${f.date}T${f.time || "23:59"}:00+06:00` : null,
      required_documents: f.documents.split("\n").map((d) => d.trim()).filter(Boolean),
      official_url: f.official_url.trim(),
    };
    setBusy(true);
    setError(null);
    try {
      const o = initial
        ? await api<AdminOpportunity>(`/admin/opportunities/${initial.id}`, { method: "PATCH", body })
        : await api<AdminOpportunity>("/admin/opportunities", { method: "POST", body });
      onSaved(o);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else setError("Could not save.");
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <h2 className="font-semibold">{initial ? "Edit opportunity" : "Add opportunity"}</h2>
      {initial?.verification_status === "verified" && (
        <p className="mt-1 text-sm text-danger">Saving changes hides this from students until someone verifies it again.</p>
      )}
      <p className="mt-1 text-sm text-muted">Copy details exactly from the official source. Never guess a deadline; leave it empty if not announced.</p>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title" htmlFor="o-title" error={errors.title}>
            <Input id="o-title" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={250} invalid={!!errors.title} />
          </Field>
        </div>
        <Field label="Provider" htmlFor="o-provider" error={errors.provider}>
          <Input id="o-provider" value={f.provider} onChange={(e) => set("provider", e.target.value)} maxLength={200} invalid={!!errors.provider} />
        </Field>
        <Field label="Category" htmlFor="o-category" error={errors.category}>
          <Select id="o-category" value={f.category} onChange={(e) => set("category", e.target.value as OpportunityCategory)} invalid={!!errors.category}>
            <option value="">Choose…</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="o-description" error={errors.description}>
            <Textarea id="o-description" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={8000} rows={4} invalid={!!errors.description} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Eligibility" htmlFor="o-eligibility" error={errors.eligibility}>
            <Textarea id="o-eligibility" value={f.eligibility} onChange={(e) => set("eligibility", e.target.value)} maxLength={4000} rows={3} invalid={!!errors.eligibility} />
          </Field>
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium">Education level <span className="font-normal text-muted">(none ticked = all levels)</span></legend>
          <div className="flex flex-wrap gap-4">
            {LEVELS.map((l) => (
              <label key={l.value} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-brand-500" checked={f.levels.includes(l.value)}
                  onChange={(e) => set("levels", e.target.checked ? [...f.levels, l.value] : f.levels.filter((x) => x !== l.value))} />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Deadline date (Bangladesh time)" htmlFor="o-date" optional hint="Leave empty if rolling or not announced." error={errors.deadline}>
          <Input id="o-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Deadline time" htmlFor="o-time">
          <Input id="o-time" type="time" value={f.time} onChange={(e) => set("time", e.target.value)} disabled={!f.date} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Required documents" htmlFor="o-docs" optional hint="One per line.">
            <Textarea id="o-docs" value={f.documents} onChange={(e) => set("documents", e.target.value)} rows={3} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Official URL" htmlFor="o-url" error={errors.official_url}>
            <Input id="o-url" type="url" value={f.official_url} onChange={(e) => set("official_url", e.target.value)} maxLength={500}
              placeholder="https://" invalid={!!errors.official_url} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" loading={busy}>
            {initial ? "Save changes" : "Save for review"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
      </form>
    </Card>
  );
}
