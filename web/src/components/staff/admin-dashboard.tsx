"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Activity, BadgeCheck, ClipboardList, GraduationCap, ShieldCheck, UserPlus, Users, UserX } from "lucide-react";
import { ButtonLink, Card, LoadError, PageHeader } from "@/components/ui";
import { DashboardSkeleton } from "@/components/staff/teacher-dashboard";
import { DayChart, LabelBars, StatTile } from "@/components/staff/charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/vengeance/tabs";
import { api, ApiError } from "@/lib/api";
import { LEVELS, timeAgo, type AdminDashboard as Data } from "@/lib/types";

export function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    () => api<Data>("/admin/dashboard").then(setData, (e) => setError(e instanceof ApiError ? e.message : "Could not load the dashboard.")),
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

  const { stats, queues, content } = data;
  const queueItems = [
    {
      label: "Opportunities to verify",
      value: queues.opportunities_pending,
      href: "/admin/opportunities",
      icon: ShieldCheck,
    },
    {
      label: "Achievements to verify",
      value: queues.achievements_pending,
      href: "/admin/achievements",
      icon: BadgeCheck,
    },
    {
      label: "Projects waiting for review",
      value: queues.projects_submitted,
      href: "/projects/review",
      icon: ClipboardList,
    },
  ];
  const contentItems = [
    ["Published courses", content.courses_published],
    ["Lessons", content.lessons],
    ["Assessments", content.assessments],
    ["Project challenges", content.challenges],
    ["Careers", content.careers],
    ["Verified opportunities", content.opportunities_verified],
  ] as const;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Admin dashboard" subtitle="Platform health, work queues and recent admin actions.">
        <div className="flex gap-2">
          <ButtonLink href="/admin/users" size="sm">
            Manage users
          </ButtonLink>
          <ButtonLink href="/admin/announcements" size="sm" variant="secondary">
            Send announcement
          </ButtonLink>
        </div>
      </PageHeader>

      <section aria-label="Users" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Students" value={stats.students} icon={GraduationCap} />
        <StatTile label="Teachers and admins" value={stats.teachers + stats.admins} icon={Users} hint={`${stats.teachers} teachers · ${stats.admins} admins`} />
        <StatTile label="Active this week" value={stats.active_7d} icon={Activity} />
        <StatTile label="New in 30 days" value={stats.new_30d} icon={UserPlus} hint={stats.deactivated ? `${stats.deactivated} deactivated` : undefined} />
      </section>

      <section aria-label="Work queues" className="grid gap-3 sm:grid-cols-3">
        {queueItems.map(({ label, value, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-card border border-line bg-card p-4 shadow-card transition-colors hover:border-brand-300"
          >
            <span
              className={
                value
                  ? "grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"
                  : "grid size-10 place-items-center rounded-xl bg-surface text-muted"
              }
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-xl font-bold tabular-nums">{value}</span>
              <span className="block text-xs text-muted">{label}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card as="section">
          <h2 className="font-semibold">Activity</h2>
          <Tabs defaultValue="signups" className="mt-3">
            <TabsList>
              <TabsTrigger value="signups">Sign-ups (30 days)</TabsTrigger>
              <TabsTrigger value="lessons">Lessons (14 days)</TabsTrigger>
              <TabsTrigger value="ai">AI Tutor (14 days)</TabsTrigger>
            </TabsList>
            <TabsContent value="signups">
              <DayChart data={data.signups} label="New sign-ups" />
            </TabsContent>
            <TabsContent value="lessons">
              <DayChart data={data.lessons_completed} label="Lessons completed" color="var(--chart-2)" />
            </TabsContent>
            <TabsContent value="ai">
              <DayChart data={data.ai_messages} label="Student questions to the AI Tutor" color="var(--chart-4)" />
            </TabsContent>
          </Tabs>
        </Card>
        <Card as="section">
          <h2 className="font-semibold">Students by level</h2>
          <div className="mt-4">
            <LabelBars
              data={data.students_by_level.map((l) => ({
                label: LEVELS.find((x) => x.value === l.label)?.label ?? "Not set",
                count: l.count,
              }))}
              label="Students"
              color="var(--chart-3)"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card as="section">
          <h2 className="font-semibold">Content</h2>
          <dl className="mt-3 divide-y divide-line">
            {contentItems.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card as="section">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent admin actions</h2>
            <Link href="/admin/audit" className="text-sm font-medium text-brand-600 hover:underline">
              Full audit log
            </Link>
          </div>
          {data.recent_audit.length ? (
            <ul className="mt-3 divide-y divide-line">
              {data.recent_audit.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{a.actor_name ?? "System"}</span> <code className="rounded bg-surface px-1.5 py-0.5 text-xs">{a.action}</code>
                  </span>
                  <time dateTime={a.created_at} className="shrink-0 text-xs text-muted">
                    {timeAgo(a.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <UserX className="size-4" aria-hidden /> No admin actions yet.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
