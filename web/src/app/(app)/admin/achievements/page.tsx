"use client";

import { useState } from "react";
import clsx from "clsx";
import { ExternalLink, Medal, ShieldAlert } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, Field, LoadError, PageHeader, Spinner, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { SKILL_KINDS, formatDay, type AdminSkillRecord, type VerificationStatus } from "@/lib/types";

const FILTERS: { value: VerificationStatus; label: string }[] = [
  { value: "unverified", label: "Needs review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminAchievementsPage() {
  const { user } = useAuth();
  if (user && user.role !== "admin")
    return (
      <EmptyState icon={<ShieldAlert className="size-7" />} title="Admins only">
        This page is for LEARN AI administrators.
      </EmptyState>
    );
  return <Achievements />;
}

function Achievements() {
  const [filter, setFilter] = useState<VerificationStatus>("unverified");
  const list = useApi<AdminSkillRecord[]>(`/admin/skill-records?status=${filter}`);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Verify achievements"
        subtitle="Students' self-reported achievements show as verified on their passport only after you check the evidence."
      />
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
        <EmptyState icon={<Medal className="size-7" />} title="Nothing here">No achievements with this status.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.data.map((r) => <Row key={r.id} r={r} onDone={list.reload} />)}
        </ul>
      )}
    </div>
  );
}

function Row({ r, onDone }: { r: AdminSkillRecord; onDone: () => void }) {
  const [note, setNote] = useState(r.review_note ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: "verified" | "rejected") {
    if (note.trim().length < 5) {
      setError("Note what you checked (or why it couldn't be verified) first.");
      return;
    }
    setBusy(status);
    setError(null);
    try {
      await api(`/admin/skill-records/${r.id}/verify`, { method: "POST", body: { status, review_note: note.trim() } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
      setBusy(null);
    }
  }

  return (
    <li>
      <Card className="space-y-3 p-5">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{SKILL_KINDS.find((k) => k.value === r.kind)?.label}</Badge>
            {r.verified_at && <Badge tone="success">Verified {formatDay(r.verified_at)}</Badge>}
          </div>
          <p className="mt-2 font-semibold">{r.title}</p>
          <p className="text-sm text-muted">
            {r.owner_name}
            {r.issued_by ? ` · ${r.issued_by}` : ""}
            {r.achieved_on ? ` · ${formatDay(r.achieved_on)}` : ""}
          </p>
          {r.description && <p className="mt-1 whitespace-pre-wrap text-sm">{r.description}</p>}
          {r.evidence_url ? (
            <a href={r.evidence_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-sm text-brand-600 hover:underline">
              {r.evidence_url} <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
          ) : (
            <p className="mt-1 text-sm text-muted">No evidence link provided.</p>
          )}
        </div>
        {error && <Alert>{error}</Alert>}
        <Field label="Review note" htmlFor={`n-${r.id}`} hint="Visible to admins only, e.g. 'Name appears on the official results page'.">
          <Textarea id={`n-${r.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </Field>
        <div className="flex gap-2">
          <Button size="sm" loading={busy === "verified"} disabled={!!busy} onClick={() => act("verified")}>Verify</Button>
          <Button size="sm" variant="secondary" loading={busy === "rejected"} disabled={!!busy} onClick={() => act("rejected")}>Can&apos;t verify</Button>
        </div>
      </Card>
    </li>
  );
}
