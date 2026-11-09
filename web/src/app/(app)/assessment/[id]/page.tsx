"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Clock, Send } from "lucide-react";
import { Alert, Badge, Button, Card, LoadError, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AssessmentResult, Attempt } from "@/lib/types";

const draftKey = (attemptId: string) => `learnai:attempt:${attemptId}`;

function loadDraft(attemptId: string): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(draftKey(attemptId));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveDraft(attemptId: string, answers: Record<string, number>) {
  try {
    window.localStorage.setItem(draftKey(attemptId), JSON.stringify(answers));
  } catch {
    /* private mode / storage full: answers stay in memory */
  }
}

function clearDraft(attemptId: string) {
  try {
    window.localStorage.removeItem(draftKey(attemptId));
  } catch {
    /* ignore */
  }
}

export default function TakeAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef<string | null>(null);
  const submitted = useRef(false);

  const start = useCallback(() => {
    setLoadError(null);
    api<Attempt>(`/assessments/${encodeURIComponent(id)}/start`, { method: "POST" }).then(
      (a) => {
        setAttempt(a);
        setAnswers(loadDraft(a.attempt_id)); // resume: answers chosen before a reload
      },
      (e) => setLoadError(e instanceof ApiError ? e : new ApiError(0, "unknown", "Could not start the assessment.")),
    );
  }, [id]);

  useEffect(() => {
    if (started.current === id) return; // guard against double-start (StrictMode, re-renders)
    started.current = id;
    start();
  }, [id, start]);

  const submit = useCallback(
    async (auto = false) => {
      if (!attempt || submitted.current) return;
      submitted.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const r = await api<AssessmentResult>(`/assessments/attempts/${attempt.attempt_id}/submit`, { method: "POST", body: { answers } });
        clearDraft(attempt.attempt_id);
        router.replace(`/assessment/results/${r.result_id}${auto ? "?auto=1" : ""}`);
      } catch (e) {
        if (e instanceof ApiError && e.code === "already_submitted") {
          clearDraft(attempt.attempt_id);
          router.replace(`/assessment/results/${attempt.attempt_id}`);
          return;
        }
        if (e instanceof ApiError && e.code === "attempt_expired") {
          clearDraft(attempt.attempt_id);
          router.replace(`/assessment/results/${attempt.attempt_id}?expired=1`);
          return;
        }
        submitted.current = false;
        setError(e instanceof ApiError ? e.message : "Could not submit. Your answers are kept; please try again.");
        setSubmitting(false);
      }
    },
    [attempt, answers, router],
  );

  const expiresAt = attempt?.expires_at ? new Date(attempt.expires_at).getTime() : null;
  const left = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null;

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // Tick the countdown; when time is up, submit whatever has been answered
  // (the server allows a short grace period for this request).
  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      if (ts >= expiresAt) submitRef.current(true);
    }, 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);

  if (loadError) return <LoadError message={loadError.status === 404 ? "This assessment does not exist." : loadError.message} onRetry={start} />;
  if (!attempt) return <Spinner label="Preparing your test…" />;

  const qs = attempt.questions;
  const q = qs[index];
  const answeredCount = qs.filter((x) => answers[x.id] !== undefined).length;
  const lowTime = left !== null && left <= 60;

  function choose(qid: string, option: number) {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: option };
      if (attempt) saveDraft(attempt.attempt_id, next);
      return next;
    });
  }

  function confirmSubmit() {
    const missing = qs.length - answeredCount;
    if (missing > 0 && !window.confirm(`You have ${missing} unanswered question${missing > 1 ? "s" : ""}. Submit anyway?`)) return;
    submit();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-fade-up">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            {attempt.is_placement && <Badge tone="brand">Placement</Badge>}
            {attempt.is_demo && <Badge>Demo</Badge>}
          </div>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">{attempt.title}</h1>
          <p className="text-sm text-muted">
            {answeredCount} of {qs.length} answered
          </p>
        </div>
        {left !== null && (
          <div
            className={clsx("inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-sm font-semibold tabular-nums", lowTime ? "border-danger/30 bg-danger-50 text-danger" : "border-line bg-white")}
            role="timer"
            aria-live={lowTime ? "assertive" : "off"}
            aria-label={`Time left: ${Math.floor(left / 60)} minutes ${left % 60} seconds`}
          >
            <Clock className="size-4" aria-hidden />
            {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
          </div>
        )}
      </header>

      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {qs.map((x, i) => (
          <button
            key={x.id}
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${answers[x.id] !== undefined ? ", answered" : ""}`}
            aria-current={i === index ? "step" : undefined}
            className={clsx(
              "size-9 rounded-lg text-sm font-medium transition-colors",
              i === index ? "bg-brand-500 text-white" : answers[x.id] !== undefined ? "bg-brand-100 text-brand-700" : "border border-line bg-white text-muted hover:border-brand-200",
            )}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <Card as="section" className="p-5 sm:p-7">
        <p className="text-sm text-muted">
          Question {index + 1} of {qs.length}
        </p>
        <fieldset className="mt-2">
          <legend className="text-lg font-semibold leading-snug whitespace-pre-wrap">{q.prompt}</legend>
          <div className="mt-5 grid gap-2.5">
            {q.options.map((opt, j) => {
              const checked = answers[q.id] === j;
              return (
                <label
                  key={j}
                  className={clsx(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40",
                    checked ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200 hover:bg-surface",
                  )}
                >
                  <input type="radio" name={`q-${q.id}`} className="mt-1 size-4 accent-brand-500" checked={checked} onChange={() => choose(q.id, j)} />
                  <span className="whitespace-pre-wrap">{opt}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      {error && <Alert>{error}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          <ArrowLeft className="size-4" aria-hidden /> Previous
        </Button>
        {index < qs.length - 1 ? (
          <Button variant="secondary" onClick={() => setIndex((i) => i + 1)}>
            Next <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={confirmSubmit} loading={submitting}>
            <Send className="size-4" aria-hidden /> Submit answers
          </Button>
        )}
      </div>
      {index < qs.length - 1 && answeredCount === qs.length && (
        <div className="text-center">
          <Button onClick={confirmSubmit} loading={submitting}>
            <Send className="size-4" aria-hidden /> All answered. Submit now
          </Button>
        </div>
      )}
    </div>
  );
}
