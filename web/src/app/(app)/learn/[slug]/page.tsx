"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowUpRight, Briefcase, CheckCircle2, Circle, CircleDot, Clock, FlaskConical, PlayCircle, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, ButtonLink, Card, LoadError, Progress, Spinner } from "@/components/ui";
import { categoryLabel } from "@/lib/courses";
import { useApi } from "@/lib/use-api";
import { levelLabel, type CourseDetail, type LessonSummary, type LibraryItem, type RelatedLink } from "@/lib/types";

export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, error, reload } = useApi<CourseDetail>(`/courses/${encodeURIComponent(slug)}`);

  if (error) return <LoadError message={error.status === 404 ? "This course does not exist or is not published." : error.message} onRetry={reload} />;
  if (!course) return <Spinner label="Loading course…" />;

  const next = course.lessons.find((l) => l.status !== "completed") ?? course.lessons[0];
  const started = course.lessons.some((l) => l.status !== "not_started");
  const modules = groupByModule(course.lessons);

  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All courses
      </Link>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{levelLabel(course.level)}</Badge>
          <Badge>{categoryLabel(course.category)}</Badge>
          {course.is_demo && <Badge>Demo</Badge>}
          {course.coming_soon && <Badge>Coming soon</Badge>}
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{course.description}</p>
        {course.coming_soon ? (
          <p className="mt-5 text-sm text-muted">
            Lessons for this course are being written. The outline and reading list below show what it will cover, about {course.estimated_hours}h in all.
          </p>
        ) : (
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
        )}
      </Card>

      {course.outline.length > 0 && (
        <section aria-labelledby="outline-heading" className="space-y-3">
          <h2 id="outline-heading" className="font-semibold">
            Course outline
          </h2>
          {course.outline.map((m, i) => (
            <Card key={m.module} className="p-0">
              <h3 className="border-b border-line px-5 py-3 text-sm font-semibold">{m.module}</h3>
              <ol className="divide-y divide-line">
                {m.lessons.map((title, j) => (
                  <li key={title} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                    <span className="w-10 shrink-0 text-xs tabular-nums text-muted">
                      {i + 1}.{j + 1}
                    </span>
                    <span className="min-w-0 flex-1">{title}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </section>
      )}

      {course.lessons.length > 0 && (
      <section aria-labelledby="lessons-heading" className="space-y-3">
        <h2 id="lessons-heading" className="font-semibold">
          {modules.length > 1 ? `${modules.length} modules · ${course.lesson_count} lessons` : "Lessons"}
        </h2>
        {modules.map((m) => (
          <Card key={m.start} className="p-0">
            {m.title && (
              <h3 className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3 text-sm font-semibold">
                <span>{m.title}</span>
                <span className="shrink-0 text-xs font-normal text-muted">
                  {m.lessons.filter((l) => l.status === "completed").length}/{m.lessons.length} done
                </span>
              </h3>
            )}
            <ol className="divide-y divide-line" start={m.start + 1}>
              {m.lessons.map((l, j) => {
                const Icon = l.status === "completed" ? CheckCircle2 : l.status === "in_progress" ? CircleDot : Circle;
                return (
                  <li key={l.id}>
                    <Link href={`/lessons/${l.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface">
                      <Icon className={clsx("size-5 shrink-0", l.status === "not_started" ? "text-line" : "text-success")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted">Lesson {m.start + j + 1}</span>
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
        ))}
      </section>
      )}

      {course.resources.length > 0 && <Library items={course.resources} />}

      {(course.related_projects.length > 0 || course.related_careers.length > 0 || course.related_opportunities.length > 0) && (
        <section aria-labelledby="related-heading" className="space-y-3">
          <h2 id="related-heading" className="font-semibold">
            Put it to use
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Related title="Projects" icon={<FlaskConical className="size-4" aria-hidden />} items={course.related_projects} href={(r) => `/projects/challenges/${r.slug}`} />
            <Related title="Careers" icon={<Briefcase className="size-4" aria-hidden />} items={course.related_careers} href={(r) => `/career/${r.slug}`} />
            <Related
              title="Verified opportunities"
              icon={<Trophy className="size-4" aria-hidden />}
              items={course.related_opportunities}
              href={(r) => `/opportunities-hub/${r.id}`}
            />
          </div>
        </section>
      )}
    </div>
  );
}

const KIND_LABELS: Record<string, string> = {
  course: "Course",
  docs: "Docs",
  book: "Book",
  video: "Video",
  tool: "Tool",
  data: "Data",
  activity: "Activity",
  article: "Article",
};

/** The course's digital library: free, external reading and practice material. */
function Library({ items }: { items: LibraryItem[] }) {
  return (
    <section aria-labelledby="library-heading" className="space-y-3">
      <div>
        <h2 id="library-heading" className="font-semibold">
          Digital library
        </h2>
        <p className="mt-0.5 text-sm text-muted">Free books, courses and tools that go with this course. Links open the original site.</p>
      </div>
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {items.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                <span className="w-16 shrink-0 text-xs text-muted">{KIND_LABELS[r.kind] ?? r.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted">{r.source}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function Related({ title, icon, items, href }: { title: string; icon: ReactNode; items: RelatedLink[]; href: (r: RelatedLink) => string }) {
  if (!items.length) return null;
  return (
    <Card className="p-0">
      <h3 className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm font-semibold">
        <span className="text-muted">{icon}</span>
        {title}
      </h3>
      <ul className="divide-y divide-line">
        {items.map((r) => (
          <li key={r.id}>
            <Link href={href(r)} className="block px-5 py-3 transition-colors hover:bg-surface">
              <span className="block text-sm font-medium">{r.title}</span>
              {r.detail && <span className="block text-xs text-muted">{r.detail}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Consecutive lessons sharing a module form one group; courses without modules give a single untitled group. */
function groupByModule(lessons: LessonSummary[]) {
  const groups: { title: string | null; start: number; lessons: LessonSummary[] }[] = [];
  lessons.forEach((l, i) => {
    const last = groups.at(-1);
    if (last && last.title === l.module) last.lessons.push(l);
    else groups.push({ title: l.module, start: i, lessons: [l] });
  });
  return groups;
}
