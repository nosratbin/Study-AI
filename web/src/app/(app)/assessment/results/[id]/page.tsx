"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { ArrowLeft, CheckCircle2, ChevronDown, Compass, Map, Target, ThumbsUp, XCircle } from "lucide-react";
import { Alert, Badge, Button, ButtonLink, Card, LoadError, Progress, Spinner } from "@/components/ui";
import StatsCounter from "@/components/vengeance/stats-counter";
import { CourseCard } from "@/components/learning/course-card";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { LEVELS, levelLabel, type AssessmentResult, type EducationLevel } from "@/lib/types";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { data: r, error, reload, setData } = useApi<AssessmentResult>(`/assessments/results/${encodeURIComponent(id)}`);
  const [switching, setSwitching] = useState(false);
  const [switchMsg, setSwitchMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [showReview, setShowReview] = useState(false);

  async function switchLevel(level: EducationLevel) {
    setSwitching(true);
    setSwitchMsg(null);
    try {
      await api("/students/profile", { method: "PATCH", body: { education_level: level } });
      setData((d) => (d ? { ...d, current_level: level } : d));
      setSwitchMsg({ tone: "success", text: `Your level is now ${levelLabel(level)}. Your courses and roadmap have been updated.` });
    } catch (e) {
      setSwitchMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Could not change your level." });
    } finally {
      setSwitching(false);
    }
  }

  if (error) return <LoadError message={error.status === 404 ? "This result does not exist." : error.message} onRetry={reload} />;
  if (!r) return <Spinner label="Loading your result…" />;

  const tone = r.percent >= 75 ? "text-success" : r.percent >= 50 ? "text-brand-600" : "text-danger";
  const rec = LEVELS.find((l) => l.value === r.recommended_level);
  const levelDiffers = r.recommended_level && r.recommended_level !== r.current_level;

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
      <Link href="/assessment" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All assessments
      </Link>

      {search.get("expired") === "1" && <Alert>Time ran out before your answers were submitted, so this attempt was closed with the answers the server had.</Alert>}
      {search.get("auto") === "1" && <Alert tone="success">Time&apos;s up. Your answers were submitted automatically.</Alert>}

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="text-center sm:w-44 sm:shrink-0">
            <p className={clsx("text-5xl font-bold tracking-tight", tone)}>
              <StatsCounter value={r.percent} suffix="%" duration={1} />
            </p>
            <p className="mt-1 text-sm text-muted">
              {r.score} of {r.max_score} correct
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              {r.is_placement && <Badge tone="brand">Placement</Badge>}
              <Badge>Scored from fixed answer keys</Badge>
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{r.title}</h1>
            <p className="text-sm text-muted">Completed {new Date(r.completed_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </div>
      </Card>

      {rec && (
        <Card as="section" className="border-brand-200 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <Compass className="size-5 text-brand-500" aria-hidden /> Recommended level: {rec.label} ({rec.tag})
          </h2>
          <p className="mt-1 text-sm text-muted">{rec.blurb}</p>
          {levelDiffers ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm">
                You are currently on <strong>{levelLabel(r.current_level)}</strong>.
              </p>
              <Button size="sm" onClick={() => switchLevel(r.recommended_level!)} loading={switching}>
                Switch to {rec.label}
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-success">This matches your current level.</p>
          )}
          {switchMsg && (
            <div className="mt-3">
              <Alert tone={switchMsg.tone}>{switchMsg.text}</Alert>
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card as="section" className="p-6">
          <h2 className="font-semibold">Score by topic</h2>
          <ul className="mt-4 space-y-4">
            {r.topics.map((t) => (
              <li key={t.topic}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{t.topic}</span>
                  <span className="text-muted">
                    {t.correct}/{t.total} · <strong className="text-ink">{t.percent}%</strong>
                  </span>
                </div>
                <Progress value={t.percent} label={`${t.topic} score`} />
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" className="space-y-5 p-6">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <ThumbsUp className="size-4 text-success" aria-hidden /> Strengths
            </h2>
            {r.strengths.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.strengths.map((s) => (
                  <Badge key={s} tone="success">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">Score 75% or more in a topic to list it here.</p>
            )}
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Target className="size-4 text-danger" aria-hidden /> Needs practice
            </h2>
            {r.weaknesses.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.weaknesses.map((s) => (
                  <Badge key={s} className="border-danger/20 bg-danger-50 text-danger">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">No weak topics. Nice work!</p>
            )}
          </div>
          <ButtonLink href="/roadmap" variant="secondary" size="sm">
            <Map className="size-4" aria-hidden /> See my roadmap
          </ButtonLink>
        </Card>
      </div>

      {r.suggested_courses.length > 0 && (
        <section aria-labelledby="suggested">
          <h2 id="suggested" className="mb-3 font-semibold">
            Suggested next courses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {r.suggested_courses.map((c) => (
              <CourseCard key={c.id} course={c} showLevel />
            ))}
          </div>
        </section>
      )}

      <Card as="section" className="p-0">
        <button onClick={() => setShowReview((v) => !v)} className="flex w-full items-center justify-between p-5 text-left font-semibold" aria-expanded={showReview}>
          Review your answers
          <ChevronDown className={clsx("size-5 text-muted transition-transform", showReview && "rotate-180")} aria-hidden />
        </button>
        {showReview && (
          <ol className="divide-y divide-line border-t border-line">
            {r.review.map((item, i) => (
              <li key={item.question_id} className="p-5">
                <p className="flex gap-2 font-medium">
                  {item.is_correct ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Correct" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-label="Incorrect" />}
                  <span className="whitespace-pre-wrap">
                    {i + 1}. {item.prompt}
                  </span>
                </p>
                <p className="mt-2 pl-7 text-sm">
                  <span className="text-muted">Your answer: </span>
                  {item.your_answer !== null ? <span className={item.is_correct ? "text-success" : "text-danger"}>{item.options[item.your_answer]}</span> : <span className="text-muted italic">Not answered</span>}
                </p>
                {item.explanation && <p className="mt-2 ml-7 rounded-lg bg-surface px-3 py-2 text-sm text-muted">{item.explanation}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
