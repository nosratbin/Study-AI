"use client";

import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { CheckCircle2, ListChecks, RefreshCw, XCircle } from "lucide-react";
import { Alert, Badge, Button, Field, Input, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Quiz } from "@/lib/types";

/** AI-generated practice questions. Checked in the browser for instant feedback; never stored or scored officially. */
export function PracticeQuiz({ disabled, defaultTopic = "" }: { disabled?: boolean; defaultTopic?: string }) {
  const [topic, setTopic] = useState(defaultTopic);
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    if (topic.trim().length < 2) return setError("Enter a topic, for example “Python loops”.");
    setBusy(true);
    setError(null);
    try {
      const q = await api<Quiz>("/ai/quiz", { method: "POST", body: { topic: topic.trim(), count } });
      setQuiz(q);
      setPicked({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate a quiz. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const answered = Object.keys(picked).length;
  const correct = quiz ? quiz.questions.filter((q, i) => picked[i] === q.correct_option).length : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <ListChecks className="size-5 text-brand-500" aria-hidden /> Practice quiz
        </h2>
        <p className="mt-1 text-sm text-muted">The AI writes practice questions on any topic. Good for revision. These are not official scores; use Assessments for those.</p>
      </div>

      <form onSubmit={generate} className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end">
        <Field label="Topic" htmlFor="quiz-topic">
          <Input id="quiz-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder="e.g. Python lists, supervised learning" disabled={disabled} />
        </Field>
        <Field label="Questions" htmlFor="quiz-count">
          <Select id="quiz-count" value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={disabled}>
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" loading={busy} disabled={disabled}>
          {quiz ? <RefreshCw className="size-4" aria-hidden /> : null}
          {quiz ? "New quiz" : "Generate"}
        </Button>
      </form>

      {error && <Alert>{error}</Alert>}

      {quiz && (
        <section aria-label={`Practice quiz on ${quiz.topic}`} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3 text-sm">
            <span>
              {answered}/{quiz.questions.length} answered · <strong>{correct} correct</strong>
            </span>
            <Badge>Practice · not an official score</Badge>
          </div>
          <ol className="space-y-5">
            {quiz.questions.map((q, i) => {
              const choice = picked[i];
              const done = choice !== undefined;
              return (
                <li key={i} className="rounded-card border border-line p-4 sm:p-5">
                  <p className="font-medium">
                    <span className="mr-1.5 text-muted">{i + 1}.</span>
                    {q.prompt}
                  </p>
                  <div className="mt-3 grid gap-2" role="group" aria-label={`Options for question ${i + 1}`}>
                    {q.options.map((opt, j) => {
                      const isKey = j === q.correct_option;
                      return (
                        <button
                          key={j}
                          type="button"
                          disabled={done}
                          onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
                          className={clsx(
                            "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                            !done && "border-line hover:border-brand-200 hover:bg-brand-50",
                            done && isKey && "border-success/30 bg-success-50 text-success",
                            done && !isKey && j === choice && "border-danger/30 bg-danger-50 text-danger",
                            done && !isKey && j !== choice && "border-line opacity-60",
                          )}
                        >
                          {done && isKey && <CheckCircle2 className="size-4 shrink-0" aria-label="Correct answer" />}
                          {done && !isKey && j === choice && <XCircle className="size-4 shrink-0" aria-label="Your answer" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                  {done && q.explanation && <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-muted">{q.explanation}</p>}
                </li>
              );
            })}
          </ol>
          <p className="text-center text-xs text-muted">{quiz.notice}</p>
        </section>
      )}
    </div>
  );
}
