"use client";

import Link from "next/link";
import { ClipboardCheck, Clock, Compass, History, ListOrdered, PlayCircle, RotateCcw } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, LoadError, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { levelLabel, type AssessmentCard } from "@/lib/types";

export default function AssessmentsPage() {
  const { data, error, reload } = useApi<AssessmentCard[]>("/assessments");

  if (error) return <LoadError message={error.message} onRetry={reload} />;
  if (!data) return <Spinner label="Loading assessments…" />;

  const placement = data.filter((a) => a.is_placement);
  const others = data.filter((a) => !a.is_placement);

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader title="Skill Assessment" subtitle="Find your level, see your strengths and get a learning path that fits you. Scores come only from fixed answer keys." />

      {placement.map((a) => (
        <Card key={a.id} as="section" className="overflow-hidden border-brand-200">
          <div className="flex flex-col gap-5 bg-gradient-to-br from-brand-50 to-white p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white" aria-hidden>
              <Compass className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">Placement</Badge>
                {a.is_demo && <Badge>Demo</Badge>}
              </div>
              <h2 className="mt-2 text-xl font-bold">{a.title}</h2>
              <Meta a={a} />
              {a.best_percent !== null && <p className="mt-1 text-sm text-muted">Best score: {a.best_percent}%</p>}
            </div>
            <Actions a={a} primaryLabel="Find my level" />
          </div>
        </Card>
      ))}

      <section aria-labelledby="topic-tests">
        <h2 id="topic-tests" className="mb-3 font-semibold">
          Topic tests for your level
        </h2>
        {others.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {others.map((a) => (
              <Card key={a.id} as="article" className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{a.title}</h3>
                  <div className="flex shrink-0 gap-1">
                    <Badge tone="brand">{levelLabel(a.level)}</Badge>
                    {a.is_demo && <Badge>Demo</Badge>}
                  </div>
                </div>
                <Meta a={a} />
                <div className="mt-2 flex-1 text-sm text-muted">{a.attempts > 0 ? <>Best score: <strong className="text-ink">{a.best_percent}%</strong> · {a.attempts} attempt{a.attempts > 1 ? "s" : ""}</> : "Not taken yet"}</div>
                <div className="mt-4">
                  <Actions a={a} primaryLabel="Start test" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ClipboardCheck className="size-7" />} title="No topic tests for your level yet" />
        )}
      </section>
    </div>
  );
}

function Meta({ a }: { a: AssessmentCard }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span className="inline-flex items-center gap-1">
        <ListOrdered className="size-4" aria-hidden /> {a.question_count} questions
      </span>
      {a.time_limit_min && (
        <span className="inline-flex items-center gap-1">
          <Clock className="size-4" aria-hidden /> {a.time_limit_min} min
        </span>
      )}
    </p>
  );
}

function Actions({ a, primaryLabel }: { a: AssessmentCard; primaryLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {a.in_progress_attempt_id ? (
        <ButtonLink href={`/assessment/${a.id}`}>
          <PlayCircle className="size-4" aria-hidden /> Resume
        </ButtonLink>
      ) : (
        <ButtonLink href={`/assessment/${a.id}`} variant={a.attempts ? "secondary" : "primary"}>
          {a.attempts ? <RotateCcw className="size-4" aria-hidden /> : <PlayCircle className="size-4" aria-hidden />}
          {a.attempts ? "Retake" : primaryLabel}
        </ButtonLink>
      )}
      {a.last_result_id && (
        <Link href={`/assessment/results/${a.last_result_id}`} className="inline-flex items-center gap-1 px-2 text-sm font-medium text-brand-600 hover:text-brand-700">
          <History className="size-4" aria-hidden /> Last result
        </Link>
      )}
    </div>
  );
}
