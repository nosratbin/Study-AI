"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Library, Lock, Plus } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input, LoadError, PageHeader, Select, Textarea } from "@/components/ui";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/vengeance/empty";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/vengeance/tabs";
import { api, ApiError } from "@/lib/api";
import { categoryLabel, COURSE_CATEGORIES } from "@/lib/courses";
import { LEVELS, levelLabel, timeAgo, type EducationLevel, type StaffCourse, type StaffCourseDetail } from "@/lib/types";

type Scope = "mine" | "all";

export default function TeacherCoursesPage() {
  const [scope, setScope] = useState<Scope>("mine");
  const [courses, setCourses] = useState<StaffCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let live = true;
    api<StaffCourse[]>(`/teacher/courses${scope === "mine" ? "?mine=true" : ""}`).then(
      (r) => live && setCourses(r),
      (e) => live && setError(e instanceof ApiError ? e.message : "Could not load courses."),
    );
    return () => {
      live = false;
    };
  }, [scope, attempt]);

  if (error)
    return (
      <LoadError
        message={error}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Course authoring" subtitle="Write courses for your students. New courses start as drafts; publish when they're ready.">
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New course
          </Button>
        )}
      </PageHeader>

      {creating && <NewCourse onCancel={() => setCreating(false)} />}

      <Tabs
        value={scope}
        onValueChange={(v) => {
          setCourses(null);
          setScope(v as Scope);
        }}
      >
        <TabsList className="mb-0">
          <TabsTrigger value="mine">My courses</TabsTrigger>
          <TabsTrigger value="all">All courses</TabsTrigger>
        </TabsList>
      </Tabs>

      {courses === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-card" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Library />
              </EmptyMedia>
              <EmptyTitle>{scope === "mine" ? "You haven't written a course yet" : "No courses yet"}</EmptyTitle>
              <EmptyDescription>Start with a short course of 3 to 5 lessons. You can add a Colab notebook to any lesson.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Card as="article" className="group relative flex h-full flex-col has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">
                    <Link href={`/teacher/courses/${c.id}`} className="after:absolute after:inset-0 after:rounded-card group-hover:text-brand-600">
                      {c.title}
                    </Link>
                  </h2>
                  <div className="flex shrink-0 gap-1">
                    {c.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}
                    {c.is_demo && <Badge>Demo</Badge>}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {levelLabel(c.level)} · {categoryLabel(c.category)} · {c.lesson_count} lessons · {c.estimated_hours}h
                </p>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{c.description || "No description yet."}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                  {!c.can_edit && (
                    <>
                      <Lock className="size-3" aria-hidden />
                      <span className="sr-only">Read only.</span>
                    </>
                  )}
                  {c.created_by_name ? `By ${c.created_by_name}` : "IccheGhuri demo content"} · updated {timeAgo(c.updated_at)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCourse({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<EducationLevel>("college");
  const [category, setCategory] = useState<string>("ai_fundamentals");
  const [hours, setHours] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const c = await api<StaffCourseDetail>("/teacher/courses", {
        method: "POST",
        body: {
          title,
          description,
          level,
          category,
          estimated_hours: Number(hours) || 1,
        },
      });
      router.push(`/teacher/courses/${c.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fieldErrors());
        setError(err.message);
      } else setError("Could not create the course.");
      setBusy(false);
    }
  }

  return (
    <Card as="section" className="border-brand-200">
      <h2 className="font-semibold">New course</h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title" htmlFor="c-title" error={fields.title}>
            <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={200} invalid={!!fields.title} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Short description" htmlFor="c-desc" optional error={fields.description}>
            <Textarea id="c-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </Field>
        </div>
        <Field label="Level" htmlFor="c-level">
          <Select id="c-level" value={level} onChange={(e) => setLevel(e.target.value as EducationLevel)}>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="c-cat">
          <Select id="c-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            {COURSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estimated hours" htmlFor="c-hours" error={fields.estimated_hours}>
          <Input id="c-hours" type="number" min={0.25} max={200} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} />
        </Field>
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={busy}>
            Create draft
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
