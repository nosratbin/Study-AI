"use client";

import Link from "next/link";
import clsx from "clsx";
import { Award, Check, Lock, PlayCircle, Sparkles } from "lucide-react";
import { Badge, ButtonLink, Card, LoadError, PageHeader, Progress, Spinner } from "@/components/ui";
import StatsCounter from "@/components/vengeance/stats-counter";
import { useApi } from "@/lib/use-api";
import { levelLabel, type Roadmap, type RoadmapStage } from "@/lib/types";

export default function RoadmapPage() {
  const { data, error, reload } = useApi<Roadmap>("/learning/roadmap");

  if (error) return <LoadError message={error.message} onRetry={reload} />;
  if (!data) return <Spinner label="Building your roadmap…" />;

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader title="Your AI Learning Roadmap" subtitle="Python → AI Fundamentals → Machine Learning → Deep Learning → AI Projects">
        <Badge tone="brand" className="self-start sm:self-auto">
          {levelLabel(data.education_level)}
        </Badge>
      </PageHeader>

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <p className="text-4xl font-bold tracking-tight text-brand-600">
          <StatsCounter value={data.overall_percent} suffix="%" duration={1} />
        </p>
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted">Overall progress across your path</p>
          <Progress value={data.overall_percent} label="Overall roadmap progress" />
        </div>
        <ButtonLink href="/assessment" variant="secondary" size="sm">
          <Sparkles className="size-4" aria-hidden /> Test out of a stage
        </ButtonLink>
      </Card>

      <ol className="relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-0.5 before:bg-line">
        {data.stages.map((s, i) => (
          <Stage key={s.key} stage={s} n={i + 1} />
        ))}
      </ol>
    </div>
  );
}

function Stage({ stage: s, n }: { stage: RoadmapStage; n: number }) {
  const current = s.status === "current";
  return (
    <li className="relative pl-14" aria-current={current ? "step" : undefined}>
      <div
        className={clsx(
          "absolute top-1 left-0 grid size-10 place-items-center rounded-full border-2 text-sm font-bold",
          s.status === "completed" && "border-success bg-success text-white",
          current && "border-brand-500 bg-brand-500 text-white ring-4 ring-brand-100",
          s.status === "upcoming" && "border-line bg-card text-muted",
          s.status === "locked" && "border-line bg-surface text-muted",
        )}
        aria-hidden
      >
        {s.status === "completed" ? <Check className="size-5" /> : s.status === "locked" ? <Lock className="size-4" /> : n}
      </div>

      <Card className={clsx("p-5 sm:p-6", current && "border-brand-200 shadow-md", s.status === "locked" && "opacity-70")}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          {current && <Badge tone="brand">You are here</Badge>}
          {s.status === "completed" && <Badge tone="success">Completed</Badge>}
          {s.skipped_by_assessment && (
            <Badge tone="success">
              <Award className="size-3" aria-hidden /> Passed by test
            </Badge>
          )}
          {s.status === "locked" && s.available_in_phase && <Badge>Opens in Phase {s.available_in_phase}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted">{s.description}</p>

        {s.status !== "locked" && s.courses.length > 0 && (
          <>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={s.percent} label={`${s.title} progress`} />
              <span className="w-10 shrink-0 text-right text-sm font-medium">{s.percent}%</span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {s.courses.map((c) => (
                <li key={c.id}>
                  <Link href={`/learn/${c.slug}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-sm hover:border-brand-200 hover:bg-brand-50">
                    {c.percent === 100 && <Check className="size-3.5 text-success" aria-hidden />}
                    {c.title}
                    {c.is_demo && <span className="text-xs text-muted">(Demo)</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {s.status !== "locked" && s.courses.length === 0 && <p className="mt-3 text-sm text-muted">Courses for this stage are coming soon.</p>}

        {s.next_lesson && s.status !== "completed" && (
          <div className="mt-4">
            <ButtonLink href={`/lessons/${s.next_lesson.lesson_id}`} size="sm" variant={current ? "primary" : "secondary"}>
              <PlayCircle className="size-4" aria-hidden /> {current ? "Continue" : "Start"}: {s.next_lesson.lesson_title}
            </ButtonLink>
          </div>
        )}
      </Card>
    </li>
  );
}
