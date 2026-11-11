"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookCheck, ClipboardCheck, FlaskConical, GraduationCap } from "lucide-react";
import { Badge, Card, LoadError } from "@/components/ui";
import { isNotVerified, NotVerifiedNotice } from "@/components/staff/not-verified";
import { StatTile } from "@/components/staff/charts";
import { Progress } from "@/components/vengeance/progress";
import { Skeleton } from "@/components/vengeance/skeleton";
import { api, ApiError } from "@/lib/api";
import { formatDay, levelLabel, PROJECT_STATUS, timeAgo, type StudentDetail } from "@/lib/types";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Keyed by id so a back/forward between students never shows the previous record.
  return <StudentView key={id} id={id} />;
}

function StudentView({ id }: { id: string }) {
  const [d, setD] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notVerified, setNotVerified] = useState(false);

  const fetchData = useCallback(
    () =>
      api<StudentDetail>(`/teacher/students/${id}`).then(
        (r) => {
          setD(r);
          setError(null);
        },
        (e) => (isNotVerified(e) ? setNotVerified(true) : setError(e instanceof ApiError ? e.message : "Could not load this student.")),
      ),
    [id],
  );
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (notVerified) return <NotVerifiedNotice title="Student" />;
  if (error)
    return (
      <LoadError
        message={error}
        onRetry={() => {
          setError(null);
          fetchData();
        }}
      />
    );
  if (!d)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );

  const s = d.student;
  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/teacher/students" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All students
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.full_name}</h1>
          {s.education_level && <Badge tone="brand">{levelLabel(s.education_level)}</Badge>}
          {s.is_minor && <Badge>Under 18</Badge>}
        </div>
        <p className="mt-1 text-muted">
          {s.institution ?? "Institution not set"} · last active {s.last_active ? timeAgo(s.last_active) : "never"}
        </p>
        {d.interests.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Interests">
            {d.interests.map((i) => (
              <li key={i}>
                <Badge>{i}</Badge>
              </li>
            ))}
          </ul>
        )}
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Lessons completed" value={s.lessons_completed} icon={BookCheck} />
        <StatTile label="Courses completed" value={s.courses_completed} icon={GraduationCap} />
        <StatTile
          label="Average assessment"
          value={s.avg_assessment}
          suffix="%"
          icon={ClipboardCheck}
          hint={s.avg_assessment === null ? "No assessments yet" : undefined}
        />
        <StatTile label="Projects submitted" value={s.projects_submitted} icon={FlaskConical} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <h2 className="font-semibold">Course progress</h2>
          {d.courses.length ? (
            <ul className="mt-3 space-y-4">
              {d.courses.map((c) => (
                <li key={c.course_id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{c.title}</span>
                    <span className="shrink-0 text-muted">
                      {c.completed_lessons}/{c.lesson_count} · {c.percent}%
                    </span>
                  </div>
                  <Progress value={c.percent} className="mt-1.5 h-1.5" aria-label={`${c.title} ${c.percent}%`} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Hasn&apos;t started a course yet.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card as="section">
            <h2 className="font-semibold">Assessment results</h2>
            {d.results.length ? (
              <ul className="mt-3 divide-y divide-line">
                {d.results.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{r.assessment_title}</span>
                    <span className="shrink-0">
                      <span className="font-semibold">{r.percent}%</span>
                      {r.completed_at && <span className="ml-2 text-xs text-muted">{formatDay(r.completed_at)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No assessments taken.</p>
            )}
          </Card>

          <Card as="section">
            <h2 className="font-semibold">Projects</h2>
            {d.projects.length ? (
              <ul className="mt-3 divide-y divide-line">
                {d.projects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{p.title}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {p.score !== null && <span className="font-semibold">{p.score}/100</span>}
                      <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No projects submitted.</p>
            )}
            {d.projects.some((p) => p.status === "submitted") && (
              <Link href="/projects/review" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
                Go to the review queue
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
