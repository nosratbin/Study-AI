"use client";

import { useState } from "react";
import clsx from "clsx";
import { BookOpen } from "lucide-react";
import { EmptyState, LoadError, PageHeader } from "@/components/ui";
import { Skeleton } from "@/components/vengeance/skeleton";
import { CourseCard } from "@/components/learning/course-card";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { LEVELS, type CourseCard as Course, type EducationLevel, type StudentProfile } from "@/lib/types";

type Tab = EducationLevel | "all";

export default function LearnPage() {
  const { user } = useAuth();
  const courses = useApi<Course[]>("/courses");
  const profile = useApi<StudentProfile>(user?.role === "student" ? "/students/profile" : null);
  const [picked, setPicked] = useState<Tab | null>(null);

  // Default to the student's own level once the profile arrives; an explicit pick always wins.
  const tab: Tab = picked ?? profile.data?.education_level ?? "all";
  const tabs: { value: Tab; label: string }[] = [{ value: "all", label: "All levels" }, ...LEVELS.map((l) => ({ value: l.value, label: l.label }))];
  const shown = (courses.data ?? []).filter((c) => tab === "all" || c.level === tab);
  const ownLevel = profile.data?.education_level;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Learning Center" subtitle="Structured AI courses for your level. Every lesson has an AI tutor one click away." />

      <div role="group" aria-label="Filter courses by level" className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 sm:inline-flex">
        {tabs.map((t) => (
          <button
            key={t.value}
            aria-pressed={tab === t.value}
            onClick={() => setPicked(t.value)}
            className={clsx(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.value ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.value === ownLevel && <span className="ml-1.5 text-xs text-brand-500">· yours</span>}
          </button>
        ))}
      </div>

      {courses.error ? (
        <LoadError message={courses.error.message} onRetry={courses.reload} />
      ) : !courses.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-card bg-brand-50" />
          ))}
        </div>
      ) : shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <CourseCard key={c.id} course={c} showLevel={tab === "all"} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<BookOpen className="size-7" />} title="No courses published for this level yet">
          Try another level, or check back soon.
        </EmptyState>
      )}
    </div>
  );
}
