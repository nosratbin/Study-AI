"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, BookCheck, ClipboardList, Users } from "lucide-react";
import { Alert, Badge, ButtonLink, Card, LoadError, PageHeader } from "@/components/ui";
import { DayChart, LabelBars, StatTile } from "@/components/staff/charts";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/vengeance/table";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { levelLabel, type TeacherDashboard as Data } from "@/lib/types";

export function TeacherDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    () => api<Data>("/teacher/dashboard").then(setData, (e) => setError(e instanceof ApiError ? e.message : "Could not load the dashboard.")),
    [],
  );
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  if (!data) return <DashboardSkeleton />;

  const { stats } = data;
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title={`Hello, ${user?.full_name.split(" ")[0] ?? "teacher"}`} subtitle="How your students are learning this week.">
        {stats.verified && (
          <div className="flex gap-2">
            <ButtonLink href="/projects/review" size="sm">
              Review projects
              {stats.review_queue ? ` (${stats.review_queue})` : ""}
            </ButtonLink>
            <ButtonLink href="/teacher/courses" size="sm" variant="secondary">
              My courses
            </ButtonLink>
          </div>
        )}
      </PageHeader>

      {!stats.verified && (
        <Alert tone="info">
          <span>
            Your teacher account is waiting for an admin to verify it. Until then you can see these totals, but not student records, course authoring or project
            reviews.
          </span>
        </Alert>
      )}

      <section aria-label="This week" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active students" value={stats.students} icon={Users} />
        <StatTile label="Learning this week" value={stats.active_7d} icon={Activity} />
        <StatTile label="Lessons completed (7 days)" value={stats.lessons_completed_7d} icon={BookCheck} />
        <StatTile label="Projects waiting for review" value={stats.review_queue} icon={ClipboardList} hint={`You reviewed ${stats.my_reviews}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card as="section">
          <h2 className="font-semibold">Lessons completed, last 14 days</h2>
          <div className="mt-4">
            <DayChart data={data.activity} label="Lessons completed" />
          </div>
        </Card>
        <Card as="section">
          <h2 className="font-semibold">Topics students find hard</h2>
          <p className="mt-0.5 text-xs text-muted">Average assessment score per topic, last 180 days.</p>
          <div className="mt-4">
            {data.weak_topics.length ? (
              <LabelBars
                data={data.weak_topics.map((t) => ({
                  label: t.label,
                  count: t.avg_percent,
                }))}
                label="Average score"
                suffix="%"
                color="var(--chart-3)"
              />
            ) : (
              <p className="text-sm text-muted">Not enough assessment answers yet.</p>
            )}
          </div>
        </Card>
      </div>

      <Card as="section" className="p-0">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
          <h2 className="font-semibold">Courses</h2>
          {stats.verified && (
            <Link href="/teacher/courses" className="text-sm font-medium text-brand-600 hover:underline">
              Manage
            </Link>
          )}
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 sm:pl-6">Course</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Lessons</TableHead>
                <TableHead className="text-right">Learners</TableHead>
                <TableHead className="text-right">Finished</TableHead>
                <TableHead className="pr-5 text-right sm:pr-6">Avg progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-72 pl-5 sm:pl-6">
                    <span className="block truncate font-medium">{c.title}</span>
                    <span className="flex gap-1 pt-0.5">
                      {!c.is_published && <Badge>Draft</Badge>}
                      {c.is_demo && <Badge>Demo</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>{levelLabel(c.level)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.lesson_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.learners}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.completions}</TableCell>
                  <TableCell className="pr-5 text-right tabular-nums sm:pr-6">{c.avg_percent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {data.assessments.length > 0 && (
        <Card as="section">
          <h2 className="font-semibold">Assessments</h2>
          <ul className="mt-3 divide-y divide-line">
            {data.assessments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">{a.title}</span>
                <span className="shrink-0 text-muted">
                  {a.attempts} attempts · <span className="font-medium text-ink">{a.avg_percent}%</span> avg
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}
