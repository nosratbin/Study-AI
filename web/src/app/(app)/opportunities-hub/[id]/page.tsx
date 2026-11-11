"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Bookmark, CalendarClock, ExternalLink, FileCheck2, GraduationCap } from "lucide-react";
import { Alert, Badge, Button, Card, LoadError, Select, Spinner, Textarea } from "@/components/ui";
import { DeadlineText } from "@/components/opportunities/opportunity-card";
import { AddDeadlineToCalendar } from "@/components/google/google-actions";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { APPLICATION_LABELS, levelLabel, type ApplicationStatus, type Opportunity, type TrackedApplicationInfo } from "@/lib/types";

const dateOnly = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(iso));

export default function OpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const { data: o, error, reload, setData } = useApi<Opportunity>(`/opportunities/${id}`);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error)
    return error.status === 404 ? (
      <div className="space-y-4">
        <Alert>This opportunity is not available. It may have closed or be under review.</Alert>
        <Link href="/opportunities-hub" className="text-sm font-medium text-brand-600">
          ← Back to Opportunity Hub
        </Link>
      </div>
    ) : (
      <LoadError message={error.message} onRetry={reload} />
    );
  if (!o) return <Spinner />;

  async function toggleSave() {
    if (!o) return;
    setSaving(true);
    setSaveError(null);
    try {
      setData(await api<Opportunity>(`/opportunities/${o.id}/save`, { method: o.saved ? "DELETE" : "POST" }));
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Could not update. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/opportunities-hub" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Opportunity Hub
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{o.category_label}</Badge>
          <Badge tone="success">
            <BadgeCheck className="size-3.5" aria-hidden /> Verified{o.verified_at ? ` ${dateOnly(o.verified_at)}` : ""}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{o.title}</h1>
        <p className="text-muted">{o.provider}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-2 font-semibold">About</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">{o.description}</p>
          </Card>
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <GraduationCap className="size-4 text-brand-600" aria-hidden /> Eligibility
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed">{o.eligibility}</p>
            <p className="mt-3 text-sm text-muted">
              Education level: {o.education_levels.length ? o.education_levels.map((l) => levelLabel(l)).join(", ") : "All levels"}
            </p>
          </Card>
          {o.required_documents.length > 0 && (
            <Card>
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <FileCheck2 className="size-4 text-brand-600" aria-hidden /> Required documents
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {o.required_documents.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Card>
          )}
          <ApplicationTracker o={o} onChange={(application) => setData({ ...o, application, saved: application ? true : o.saved })} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="size-4 text-brand-600" aria-hidden /> Deadline
              </h2>
              <p className="mt-1 text-sm">
                <DeadlineText o={o} />
              </p>
              {o.deadline && <p className="mt-1 text-xs text-muted">Bangladesh time</p>}
            </div>
            <a
              href={o.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
            >
              Apply on the official website <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="break-all text-xs text-muted">{new URL(o.official_url).hostname}</p>
            <Button variant="secondary" className="w-full" loading={saving} onClick={toggleSave} aria-pressed={o.saved}>
              <Bookmark className={o.saved ? "size-4 fill-current" : "size-4"} aria-hidden /> {o.saved ? "Saved" : "Save"}
            </Button>
            {saveError && <Alert>{saveError}</Alert>}
            {o.deadline && !o.is_closed && <AddDeadlineToCalendar opportunityId={o.id} />}
          </Card>
          <p className="text-xs leading-relaxed text-muted">
            Our team checked this against the official source. Details can change, so always confirm the deadline and requirements on the official
            website. IccheGhuri never submits applications for you.
          </p>
        </aside>
      </div>
    </div>
  );
}

function ApplicationTracker({ o, onChange }: { o: Opportunity; onChange: (a: TrackedApplicationInfo | null) => void }) {
  const [status, setStatus] = useState<ApplicationStatus>(o.application?.status ?? "planned");
  const [notes, setNotes] = useState(o.application?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const a = await api<TrackedApplicationInfo>(`/opportunities/${o.id}/application`, { method: "PUT", body: { status, notes: notes.trim() || null } });
      onChange(a);
      setMsg({ tone: "success", text: "Saved. You'll find it under My applications." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Could not save. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/opportunities/${o.id}/application`, { method: "DELETE" });
      onChange(null);
      setStatus("planned");
      setNotes("");
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Could not remove. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <h2 className="font-semibold">Track your application</h2>
      <p className="mt-1 text-sm text-muted">A private note to yourself. Nothing is sent to the provider.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
        <div>
          <label htmlFor="app-status" className="mb-1 block text-sm font-medium">
            Status
          </label>
          <Select id="app-status" value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
            {(Object.keys(APPLICATION_LABELS) as ApplicationStatus[]).map((s) => (
              <option key={s} value={s}>
                {APPLICATION_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="app-notes" className="mb-1 block text-sm font-medium">
            Notes <span className="font-normal text-muted">(optional)</span>
          </label>
          <Textarea id="app-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3}
            placeholder="e.g. Need the principal's recommendation letter" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" loading={busy} onClick={save}>
          {o.application ? "Update" : "Start tracking"}
        </Button>
        {o.application && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
            Stop tracking
          </Button>
        )}
      </div>
      {msg && (
        <div className="mt-3">
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      )}
    </Card>
  );
}
