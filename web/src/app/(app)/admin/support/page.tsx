"use client";

import { useState } from "react";
import { ExternalLink, HeartHandshake, Inbox, Phone, Plus, ShieldAlert } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadError, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  SUPPORT_TOPICS,
  formatDay,
  formatDeadline,
  type AdminSupportRequest,
  type AdminSupportResource,
  type SupportRequestStatus,
  type SupportResourceKind,
} from "@/lib/types";

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"inbox" | "directory">("inbox");
  if (user && user.role !== "admin")
    return (
      <EmptyState icon={<ShieldAlert className="size-7" />} title="Admins only">
        This page is for LEARN AI administrators.
      </EmptyState>
    );
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="MindCare support" subtitle="Student support requests and the verified directory of counsellors and helplines." />
      <div role="tablist" aria-label="Sections" className="flex gap-1 rounded-xl bg-surface p-1 sm:inline-flex">
        {(["inbox", "directory"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {t === "inbox" ? "Requests" : "Directory"}
          </button>
        ))}
      </div>
      {tab === "inbox" ? <RequestInbox /> : <Directory />}
    </div>
  );
}

/* ---------- Requests ---------- */

const STATUS_LABEL: Record<SupportRequestStatus, string> = { open: "New", in_progress: "In progress", closed: "Closed" };

function RequestInbox() {
  const [showClosed, setShowClosed] = useState(false);
  const list = useApi<AdminSupportRequest[]>(`/admin/support-requests${showClosed ? "?include_closed=true" : ""}`);

  async function setStatus(id: string, status: SupportRequestStatus) {
    try {
      await api(`/admin/support-requests/${id}`, { method: "PATCH", body: { status } });
      list.reload();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Could not update.");
    }
  }

  return (
    <section className="space-y-4">
      <Alert tone="success">
        Every time this inbox is opened it is recorded in the audit log. Contact students only about their request, and follow your safeguarding
        procedure for anyone under 18 or at risk. In an emergency, call 999.
      </Alert>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-brand-500" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
        Show closed requests
      </label>
      {list.error ? (
        <LoadError message={list.error.message} onRetry={list.reload} />
      ) : !list.data ? (
        <Spinner />
      ) : !list.data.length ? (
        <EmptyState icon={<Inbox className="size-7" />} title="No open requests" />
      ) : (
        <ul className="space-y-3">
          {list.data.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.status === "open" ? "brand" : r.status === "in_progress" ? "success" : "neutral"}>{STATUS_LABEL[r.status]}</Badge>
                  <Badge>{SUPPORT_TOPICS.find((t) => t.value === r.topic)?.label}</Badge>
                  {r.is_minor && <Badge tone="brand">Under 18</Badge>}
                  <span className="text-xs text-muted">{formatDeadline(r.created_at)}</span>
                </div>
                <p className="font-semibold">{r.student_name}</p>
                <p className="text-sm">
                  {r.preferred_contact === "phone" && r.phone ? (
                    <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={`tel:${r.phone.replace(/[^0-9+]/g, "")}`}><Phone className="size-3.5" aria-hidden /> {r.phone}</a>
                  ) : (
                    <a className="text-brand-600 hover:underline" href={`mailto:${r.student_email}`}>{r.student_email}</a>
                  )}
                  <span className="text-muted"> · prefers {r.preferred_contact}</span>
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm">{r.message ?? "(message could not be decrypted)"}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.status !== "in_progress" && <Button size="sm" variant="secondary" onClick={() => setStatus(r.id, "in_progress")}>Mark in progress</Button>}
                  {r.status !== "closed" && <Button size="sm" variant="secondary" onClick={() => setStatus(r.id, "closed")}>Close</Button>}
                  {r.status === "closed" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "open")}>Reopen</Button>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Directory ---------- */

function Directory() {
  const list = useApi<AdminSupportResource[]>("/admin/support-resources");
  const [editing, setEditing] = useState<AdminSupportResource | "new" | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Students only see verified entries. Call or visit each service to confirm the details before verifying. Editing an entry un-verifies it.</p>
        {!editing && <Button onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden /> Add resource</Button>}
      </div>
      {editing && (
        <ResourceEditor
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(r) => { setEditing(null); setReviewing(r.id); list.reload(); }}
        />
      )}
      {list.error ? (
        <LoadError message={list.error.message} onRetry={list.reload} />
      ) : !list.data ? (
        <Spinner />
      ) : !list.data.length ? (
        <EmptyState icon={<HeartHandshake className="size-7" />} title="No resources yet">Add counsellors and helplines you have confirmed.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.data.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2 p-5">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={r.verification_status === "verified" ? "success" : r.verification_status === "rejected" ? "neutral" : "brand"}>
                    {r.verification_status === "verified" ? "Verified · visible to students" : r.verification_status === "rejected" ? "Rejected" : "Needs review"}
                  </Badge>
                  <Badge className="capitalize">{r.kind}</Badge>
                </div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted">{r.description}</p>
                <p className="flex flex-wrap gap-4 text-sm">
                  {r.phone && <span>{r.phone}</span>}
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">{r.url} <ExternalLink className="size-3.5" aria-hidden /></a>}
                </p>
                {r.verified_by_name && r.verified_at && <p className="text-xs text-muted">Verified by {r.verified_by_name} on {formatDay(r.verified_at)}</p>}
                {r.source_note && <p className="text-xs text-muted">Source note: {r.source_note}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setReviewing(null); setEditing(r); }}>Edit</Button>
                  <Button size="sm" onClick={() => setReviewing(reviewing === r.id ? null : r.id)}>Review</Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (!window.confirm(`Delete ${r.name}?`)) return;
                      try {
                        await api(`/admin/support-resources/${r.id}`, { method: "DELETE" });
                      } catch (e) {
                        window.alert(e instanceof ApiError ? e.message : "Could not delete.");
                      }
                      list.reload();
                    }}
                  >
                    Delete
                  </Button>
                </div>
                {reviewing === r.id && <ResourceReview r={r} onDone={() => { setReviewing(null); list.reload(); }} />}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResourceReview({ r, onDone }: { r: AdminSupportResource; onDone: () => void }) {
  const [note, setNote] = useState(r.source_note ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: "verified" | "rejected") {
    if (note.trim().length < 5) {
      setError("Say how you confirmed the details (e.g. 'Called on 12 Nov, confirmed hours and fee').");
      return;
    }
    setBusy(status);
    setError(null);
    try {
      await api(`/admin/support-resources/${r.id}/verify`, { method: "POST", body: { status, source_note: note.trim() } });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 border-t border-line pt-3">
      {error && <Alert>{error}</Alert>}
      <Field label="How did you confirm it?" htmlFor={`src-${r.id}`}>
        <Textarea id={`src-${r.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" loading={busy === "verified"} disabled={!!busy} onClick={() => act("verified")}>Verify</Button>
        <Button size="sm" variant="secondary" loading={busy === "rejected"} disabled={!!busy} onClick={() => act("rejected")}>Reject</Button>
      </div>
    </div>
  );
}

function ResourceEditor({ initial, onCancel, onSaved }: { initial: AdminSupportResource | null; onCancel: () => void; onSaved: (r: AdminSupportResource) => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    kind: (initial?.kind ?? "counsellor") as SupportResourceKind,
    description: initial?.description ?? "",
    phone: initial?.phone ?? "",
    url: initial?.url ?? "",
    hours: initial?.hours ?? "",
    cost_note: initial?.cost_note ?? "",
    bn: initial ? initial.languages.includes("bn") : true,
    en: initial ? initial.languages.includes("en") : false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: form.name, kind: form.kind, description: form.description, phone: form.phone.trim() || null, url: form.url.trim() || null,
      hours: form.hours.trim() || null, cost_note: form.cost_note.trim() || null,
      languages: [form.bn && "bn", form.en && "en"].filter(Boolean),
    };
    try {
      const r = initial
        ? await api<AdminSupportResource>(`/admin/support-resources/${initial.id}`, { method: "PUT", body })
        : await api<AdminSupportResource>("/admin/support-resources", { method: "POST", body });
      onSaved(r);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else setError("Could not save.");
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={save} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="sr-name" error={errors.name}>
            <Input id="sr-name" value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={2} maxLength={200} invalid={!!errors.name} />
          </Field>
          <Field label="Type" htmlFor="sr-kind">
            <Select id="sr-kind" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="counsellor">Counsellor / counselling centre</option>
              <option value="helpline">Helpline</option>
              <option value="organisation">Organisation</option>
            </Select>
          </Field>
          <Field label="Phone" htmlFor="sr-phone" optional error={errors.phone}>
            <Input id="sr-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} invalid={!!errors.phone} />
          </Field>
          <Field label="Website" htmlFor="sr-url" optional error={errors.url}>
            <Input id="sr-url" type="url" placeholder="https://…" value={form.url} onChange={(e) => set("url", e.target.value)} invalid={!!errors.url} />
          </Field>
          <Field label="Hours" htmlFor="sr-hours" optional>
            <Input id="sr-hours" value={form.hours} onChange={(e) => set("hours", e.target.value)} maxLength={120} placeholder="e.g. Sun–Thu, 9am–5pm" />
          </Field>
          <Field label="Cost" htmlFor="sr-cost" optional>
            <Input id="sr-cost" value={form.cost_note} onChange={(e) => set("cost_note", e.target.value)} maxLength={200} placeholder="e.g. Free for students" />
          </Field>
        </div>
        <Field label="Description" htmlFor="sr-desc" error={errors.description}>
          <Textarea id="sr-desc" value={form.description} onChange={(e) => set("description", e.target.value)} required minLength={10} maxLength={2000} invalid={!!errors.description} />
        </Field>
        <fieldset className="flex gap-4 text-sm">
          <legend className="mb-1 text-sm font-medium">Languages</legend>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-500" checked={form.bn} onChange={(e) => set("bn", e.target.checked)} /> বাংলা</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-500" checked={form.en} onChange={(e) => set("en", e.target.checked)} /> English</label>
        </fieldset>
        <div className="flex gap-2">
          <Button type="submit" loading={busy}>Save</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
