"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, CheckCircle2, Circle, CircleDot, Clock, PlayCircle } from "lucide-react";
import { Badge, ButtonLink, Card, LoadError, Progress, Spinner } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { levelLabel, type CourseDetail } from "@/lib/types";

export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, error, reload } = useApi<CourseDetail>(`/courses/${encodeURIComponent(slug)}`);

  if (error) return <LoadError message={error.status === 404 ? "This course does not exist or is not published." : error.message} onRetry={reload} />;
  if (!course) return <Spinner label="Loading course…" />;

  const next = course.lessons.find((l) => l.status !== "completed") ?? course.lessons[0];
  const started = course.lessons.some((l) => l.status !== "not_started");

  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All courses
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{levelLabel(course.level)}</Badge>
          <Badge>{course.category.replace(/_/g, " ")}</Badge>
          {course.is_demo && <Badge>Demo</Badge>}
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{course.description}</p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full max-w-sm space-y-1.5">
            <div className="flex justify-between text-sm text-muted">
              <span>
                {course.completed_lessons}/{course.lesson_count} lessons · {course.estimated_hours}h
              </span>
              <span className="font-semibold text-ink">{course.percent}%</span>
            </div>
            <Progress value={course.percent} label="Course progress" />
          </div>
          {next && (
            <ButtonLink href={`/lessons/${next.id}`}>
              <PlayCircle className="size-4" aria-hidden />
              {course.percent === 100 ? "Review course" : started ? "Continue" : "Start course"}
            </ButtonLink>
          )}
        </div>
      </Card>

      <section aria-labelledby="lessons-heading">
        <h2 id="lessons-heading" className="mb-3 font-semibold">
          Lessons
        </h2>
        <Card>
          <ol className="divide-y divide-line">
            {course.lessons.map((l, i) => {
              const Icon = l.status === "completed" ? CheckCircle2 : l.status === "in_progress" ? CircleDot : Circle;
              return (
                <li key={l.id}>
                  <Link href={`/lessons/${l.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface">
                    <Icon className={clsx("size-5 shrink-0", l.status === "not_started" ? "text-line" : "text-success")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted">Lesson {i + 1}</span>
                      <span className="block truncate font-medium">{l.title}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                      <Clock className="size-3.5" aria-hidden /> {l.duration_min} min
                    </span>
                    <span className="sr-only">{l.status.replace("_", " ")}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>
    </div>
  );
}
