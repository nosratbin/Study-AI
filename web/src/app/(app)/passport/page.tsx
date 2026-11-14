"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, BadgeCheck, Copy, ExternalLink, Medal, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadError, PageHeader, Progress, Select, Spinner, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { LEVELS, SKILL_KINDS, formatDay, type Passport, type ShareState, type SkillKind, type SkillRecord } from "@/lib/types";

export default function PassportPage() {
  const pp = useApi<Passport>("/skills/passport");
  const [adding, setAdding] = useState(false);

  if (pp.error) return <LoadError message={pp.error.message} onRetry={pp.reload} />;
  if (!pp.data) return <Spinner />;
  const p = pp.data;
  const level = LEVELS.find((l) => l.value === p.education_level)?.label;

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader title="Skill Passport" subtitle="Everything you've learned and achieved in one place. Share a link with teachers, universities or employers." />

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-50 text-xl font-bold text-brand-700" aria-hidden>
          {p.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold">{p.full_name}</p>
          <p className="text-muted">{[level, p.institution].filter(Boolean).join(" · ") || "Add your level and institution in Settings"}</p>
          {p.skills.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Skills">
              {p.skills.map((s) => <li key={s}><Badge tone="brand">{s}</Badge></li>)}
            </ul>
          )}
        </div>
      </Card>

      <ShareCard share={p.share} isMinor={p.is_minor} onChange={(share) => pp.setData({ ...p, share })} />

      <Section title="Courses completed">
        {!p.courses.length && !p.in_progress_courses.length ? (
          <EmptyState icon={<Award className="size-7" />} title="No courses yet">
            Finish every lesson of a course in the <Link href="/learn" className="text-brand-600 hover:underline">Learning Center</Link> to earn a certificate.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {p.courses.map((c) => (
              <li key={c.course_id}>
                <Card className="h-full p-5">
                  {c.is_demo && <Badge>Demo course</Badge>}
                  <p className="mt-1 font-semibold">{c.title}</p>
                  {c.certificate_code && (
                    <p className="mt-1 text-sm text-muted">
                      Certificate{" "}
                      <Link className="font-mono text-brand-600 hover:underline" href={`/certificates/${c.certificate_code}`} target="_blank">{c.certificate_code}</Link>
                      {c.issued_at ? ` · ${formatDay(c.issued_at)}` : ""}
                    </p>
                  )}
                </Card>
              </li>
            ))}
            {p.in_progress_courses.map((c) => (
              <li key={c.course_id}>
                <Card className="h-full space-y-2 p-5">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-muted">In progress · {c.completed_lessons} of {c.total_lessons} lessons</p>
                  <Progress value={(c.completed_lessons / Math.max(1, c.total_lessons)) * 100} label={`${c.title} progress`} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {p.assessments.length > 0 && (
        <Section title="Assessments">
          <ul className="space-y-2">
            {p.assessments.map((a, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm">
                <span className="font-medium">{a.title}</span>
                <span className="text-muted">{a.score} / {a.max_score}{a.completed_at ? ` · ${formatDay(a.completed_at)}` : ""}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Projects">
        {!p.projects.length ? (
          <p className="text-sm text-muted">Build one in the <Link href="/projects" className="text-brand-600 hover:underline">Project Lab</Link>.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {p.projects.map((pr) => (
              <li key={pr.id}>
                <Link href={`/projects/${pr.id}`} className="block h-full rounded-card border border-line bg-card p-5 shadow-card hover:border-brand-200">
                  <div className="flex flex-wrap gap-2">
                    {pr.reviewed ? <Badge tone="success"><BadgeCheck className="size-3.5" aria-hidden /> Teacher reviewed</Badge> : <Badge>{pr.status === "draft" ? "Draft" : "Submitted"}</Badge>}
                    {pr.is_public && <Badge>Public</Badge>}
                  </div>
                  <p className="mt-2 font-semibold">{pr.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Achievements"
        action={!adding && <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden /> Add</Button>}
      >
        <p className="text-sm text-muted">
          Awards, competitions, volunteering and more. They show as <strong>self-reported</strong> until a IccheGhuri admin checks your evidence link.
        </p>
        {adding && <RecordForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); pp.reload(); }} />}
        {p.records.length > 0 && (
          <ul className="space-y-2">
            {p.records.map((r) => <RecordRow key={r.id} r={r} onChange={pp.reload} />)}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ShareCard({ share, isMinor, onChange }: { share: ShareState; isMinor: boolean; onChange: (s: ShareState) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = share.token && typeof window !== "undefined" ? `${window.location.origin}/p/${share.token}` : null;

  async function act(label: string, fn: () => Promise<ShareState>) {
    setBusy(label);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update sharing.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it manually.");
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Public link</p>
          <p className="text-sm text-muted">
            {share.enabled ? "Anyone with the link can see your completed courses, public projects and public achievements." : "Off. Only you can see your passport."}
            {isMinor && " Because you're under 18, the public page shows only your first name and surname initial, and hides your school."}
          </p>
        </div>
        <Button
          variant={share.enabled ? "secondary" : "primary"}
          size="sm"
          loading={busy === "toggle"}
          onClick={() => act("toggle", () => api<ShareState>("/skills/passport/share", { method: "PUT", body: { enabled: !share.enabled } }))}
        >
          {share.enabled ? "Turn off" : "Turn on sharing"}
        </Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {share.enabled && url && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={url} aria-label="Public passport link" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="h-11" onClick={copy}><Copy className="size-4" aria-hidden /> {copied ? "Copied" : "Copy"}</Button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold hover:bg-surface">
              Preview <ExternalLink className="size-4" aria-hidden />
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="h-11"
              loading={busy === "rotate"}
              title="Make a new link; the old one stops working"
              onClick={() => {
                if (window.confirm("Create a new link? Anyone with the old link will lose access.")) act("rotate", () => api<ShareState>("/skills/passport/share/rotate", { method: "POST" }));
              }}
            >
              <RefreshCw className="size-4" aria-hidden /> New link
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function RecordRow({ r, onChange }: { r: SkillRecord; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const kind = SKILL_KINDS.find((k) => k.value === r.kind)?.label.replace(/ \(.*\)$/, "");

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onChange();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-line bg-card px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge>{kind}</Badge>
            {r.verification_status === "verified" ? (
              <Badge tone="success"><BadgeCheck className="size-3.5" aria-hidden /> Verified</Badge>
            ) : r.verification_status === "rejected" ? (
              <Badge>Couldn&apos;t verify</Badge>
            ) : (
              <Badge tone="brand">Self-reported</Badge>
            )}
          </div>
          <p className="mt-1 font-medium">{r.title}</p>
          <p className="text-sm text-muted">{[r.issued_by, r.achieved_on && formatDay(r.achieved_on)].filter(Boolean).join(" · ")}</p>
          {r.evidence_url && (
            <a href={r.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-sm text-brand-600 hover:underline">
              Evidence <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" className="size-4 accent-brand-500" checked={r.is_public} disabled={busy}
              onChange={(e) => act(() => api(`/skills/records/${r.id}`, { method: "PATCH", body: { is_public: e.target.checked } }))} />
            Public
          </label>
          <button
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger"
            aria-label={`Delete ${r.title}`}
            disabled={busy}
            onClick={() => window.confirm("Delete this achievement?") && act(() => api(`/skills/records/${r.id}`, { method: "DELETE" }))}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

function RecordForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ kind: "award" as SkillKind, title: "", issued_by: "", achieved_on: "", evidence_url: "", description: "", is_public: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/skills/records", {
        method: "POST",
        body: {
          kind: form.kind, title: form.title, issued_by: form.issued_by.trim() || null, achieved_on: form.achieved_on || null,
          evidence_url: form.evidence_url.trim() || null, description: form.description.trim() || null, is_public: form.is_public,
        },
      });
      onSaved();
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
          <Field label="Type" htmlFor="rk">
            <Select id="rk" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              {SKILL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
          </Field>
          <Field label="Title" htmlFor="rt" error={errors.title}>
            <Input id="rt" value={form.title} onChange={(e) => set("title", e.target.value)} required minLength={2} maxLength={200} placeholder="e.g. District science fair, 2nd place" invalid={!!errors.title} />
          </Field>
          <Field label="Given by" htmlFor="ri" optional error={errors.issued_by}>
            <Input id="ri" value={form.issued_by} onChange={(e) => set("issued_by", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Date" htmlFor="rd" optional error={errors.achieved_on}>
            <Input id="rd" type="date" value={form.achieved_on} onChange={(e) => set("achieved_on", e.target.value)} invalid={!!errors.achieved_on} />
          </Field>
        </div>
        <Field label="Evidence link" htmlFor="re" optional error={errors.evidence_url} hint="A results page, certificate or news post. Needed for an admin to verify it.">
          <Input id="re" type="url" inputMode="url" placeholder="https://…" value={form.evidence_url} onChange={(e) => set("evidence_url", e.target.value)} invalid={!!errors.evidence_url} />
        </Field>
        <Field label="Details" htmlFor="rdesc" optional error={errors.description}>
          <Textarea id="rdesc" value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-brand-500" checked={form.is_public} onChange={(e) => set("is_public", e.target.checked)} />
          Show on my public passport
        </label>
        <div className="flex gap-2">
          <Button type="submit" loading={busy}><Medal className="size-4" aria-hidden /> Save achievement</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
