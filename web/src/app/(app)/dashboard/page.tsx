"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, PlayCircle, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, Spinner } from "@/components/ui";
import { CourseCard } from "@/components/learning/course-card";
import { AdminDashboard } from "@/components/staff/admin-dashboard";
import { TeacherDashboard } from "@/components/staff/teacher-dashboard";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LEVELS, type Dashboard } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "teacher") return <TeacherDashboard />;
  return <StudentDashboard />;
}

function StudentDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    () =>
      api<Dashboard>("/students/dashboard").then(setData, (e) =>
        setError(e instanceof ApiError ? e.message : "Could not load your dashboard."),
      ),
    [],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const load = () => {
    setError(null);
    fetchData();
  };

  if (error)
    return (
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <Button variant="secondary" onClick={load}>
          <RefreshCw className="size-4" /> Try again
        </Button>
      </div>
    );
  if (!data) return <Spinner label="Loading your dashboard…" />;

  const level = LEVELS.find((l) => l.value === data.education_level);
  const bn = data.preferred_language === "bn";
  const stats = [
    { label: "Lessons completed", value: data.stats.lessons_completed, icon: CheckCircle2 },
    { label: "Courses in progress", value: data.stats.courses_in_progress, icon: BookOpen },
    { label: "Assessments taken", value: data.stats.assessments_taken, icon: ClipboardCheck,
      sub: data.stats.latest_score_percent !== null ? `Latest: ${data.stats.latest_score_percent}%` : undefined },
    { label: "Saved opportunities", value: data.stats.saved_opportunities, icon: Trophy },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {bn ? <span lang="bn">স্বাগতম, {data.greeting_name}!</span> : <>Welcome back, {data.greeting_name}!</>}
          </h1>
          <p className="mt-1 text-muted">Here&apos;s where you are on your AI learning journey.</p>
        </div>
        {level && (
          <Badge tone="brand" className="self-start sm:self-auto">
            {level.label} · {level.tag}
          </Badge>
        )}
      </header>

      <section aria-label="Your progress" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label} className="p-4 sm:p-5">
            <Icon className="size-5 text-brand-500" aria-hidden />
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
            {sub && <p className="mt-0.5 text-xs text-success">{sub}</p>}
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card as="section" className="p-5 sm:p-6">
            <h2 className="font-semibold">Continue learning</h2>
            {data.continue_learning ? (
              <Link href={`/lessons/${data.continue_learning.lesson_id}`} className="mt-4 flex items-center gap-4 rounded-xl bg-brand-50 p-4 transition-colors hover:bg-brand-100">
                <PlayCircle className="size-10 shrink-0 text-brand-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-muted">{data.continue_learning.course_title}</p>
                  <p className="truncate font-semibold">{data.continue_learning.lesson_title}</p>
                  <p className="text-xs text-muted">{data.continue_learning.duration_min} min</p>
                </div>
                <span className="hidden text-sm font-semibold text-brand-600 sm:inline">Continue →</span>
              </Link>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted">Pick a course to start, or take the placement test to find your level.</p>
                <div className="flex gap-2">
                  <ButtonLink href="/learn" size="sm">Browse courses</ButtonLink>
                  <ButtonLink href="/assessment" size="sm" variant="secondary">Placement test</ButtonLink>
                </div>
              </div>
            )}
          </Card>

          <section aria-labelledby="rec-heading">
            <h2 id="rec-heading" className="mb-3 font-semibold">
              Recommended for {level ? level.label.toLowerCase() : "you"}
            </h2>
            {data.recommended_courses.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.recommended_courses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<BookOpen className="size-7" />} title="No courses published for your level yet" />
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card as="section" className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <CalendarClock className="size-4 text-brand-500" aria-hidden /> Upcoming deadlines
            </h2>
            {data.upcoming_deadlines.length ? (
              <ul className="mt-3 divide-y divide-line">
                {data.upcoming_deadlines.map((d) => (
                  <li key={d.opportunity_id} className="py-2.5">
                    <a href={d.official_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-brand-600">
                      {d.title}
                    </a>
                    <p className="text-xs text-muted">{new Date(d.deadline).toLocaleDateString(bn ? "bn-BD" : "en-GB", { dateStyle: "medium" })}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Deadlines of opportunities you save will show here.</p>
            )}
          </Card>

          <Card as="section" className="p-5">
            <h2 className="font-semibold">Your modules</h2>
            <ul className="mt-3 space-y-2">
              {data.modules.filter((m) => m.key !== "dashboard").map((m) => (
                <li key={m.key} className="flex items-center justify-between text-sm">
                  <span className={m.available ? "" : "text-muted"}>{m.title}</span>
                  {m.available ? <Badge tone="success">Ready</Badge> : <Badge>Phase {m.phase}</Badge>}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
