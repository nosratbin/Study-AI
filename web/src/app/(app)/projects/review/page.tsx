"use client";

import { useState } from "react";
import { ClipboardCheck, ExternalLink, ShieldAlert } from "lucide-react";
import { Alert, Button, Card, EmptyState, Field, Input, LoadError, PageHeader, Spinner, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDay, type Project } from "@/lib/types";

export default function ReviewQueuePage() {
  const { user } = useAuth();
  if (user && user.role === "student")
    return (
      <EmptyState icon={<ShieldAlert className="size-7" />} title="Teachers only">
        This page is for teachers reviewing student projects.
      </EmptyState>
    );
  return <Queue />;
}

function Queue() {
  const q = useApi<Project[]>("/projects/review-queue");
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Project reviews" subtitle="Oldest submissions first. Your feedback and optional score are shown to the student." />
      {q.error ? (
        <LoadError message={q.error.message} onRetry={q.reload} />
      ) : !q.data ? (
        <Spinner />
      ) : !q.data.length ? (
        <EmptyState icon={<ClipboardCheck className="size-7" />} title="All caught up">No projects are waiting for review.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {q.data.map((p) => (
            <li key={p.id}>
              <Card className="space-y-3 p-5">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-muted">
                    {p.owner_name} · {p.challenge ? p.challenge.title : "Own idea"} · submitted {p.submitted_at ? formatDay(p.submitted_at) : "—"}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-4 text-sm">
                    {p.colab_url && <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={p.colab_url} target="_blank" rel="noopener noreferrer">Colab <ExternalLink className="size-3.5" aria-hidden /></a>}
                    {p.repo_url && <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={p.repo_url} target="_blank" rel="noopener noreferrer">Repository <ExternalLink className="size-3.5" aria-hidden /></a>}
                  </p>
                </div>
                <details className="rounded-xl bg-surface p-3 text-sm">
                  <summary className="cursor-pointer font-medium">Student write-up</summary>
                  <p className="mt-2 whitespace-pre-wrap">{p.documentation}</p>
                </details>
                {open === p.id ? (
                  <ReviewForm p={p} onDone={() => { setOpen(null); q.reload(); }} onCancel={() => setOpen(null)} />
                ) : (
                  <Button size="sm" onClick={() => setOpen(p.id)}>Write review</Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewForm({ p, onDone, onCancel }: { p: Project; onDone: () => void; onCancel: () => void }) {
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/projects/${p.id}/review`, { method: "POST", body: { feedback, score: score === "" ? null : Number(score) } });
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else setError("Could not save the review.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="space-y-4 border-t border-line pt-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Feedback" htmlFor={`fb-${p.id}`} error={errors.feedback} hint="What works, what to improve, and one concrete next step.">
        <Textarea id={`fb-${p.id}`} value={feedback} onChange={(e) => setFeedback(e.target.value)} minLength={10} maxLength={5000} required invalid={!!errors.feedback} />
      </Field>
      <Field label="Score (0–100)" htmlFor={`sc-${p.id}`} optional error={errors.score}>
        <Input id={`sc-${p.id}`} type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} className="max-w-32" />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>Send review</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
