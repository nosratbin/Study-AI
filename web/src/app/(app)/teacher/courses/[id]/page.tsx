"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input, LoadError, Select, Textarea } from "@/components/ui";
import { Markdown } from "@/components/learning/markdown";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Switch } from "@/components/vengeance/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/vengeance/tabs";
import { api, ApiError } from "@/lib/api";
import { COURSE_CATEGORIES } from "@/lib/courses";
import { LEVELS, type EducationLevel, type StaffCourseDetail, type StaffLesson } from "@/lib/types";

export default function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  // Keyed by id so moving between courses never shows the previous course or its unsaved form state.
  return <CourseView key={id} id={id} />;
}

function CourseView({ id }: { id: string }) {
  const [course, setCourse] = useState<StaffCourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    () =>
      api<StaffCourseDetail>(`/teacher/courses/${id}`).then(
        (r) => {
          setCourse(r);
          setError(null);
        },
        (e) => setError(e instanceof ApiError ? e.message : "Could not load the course."),
      ),
    [id],
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
  if (!course)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/teacher/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All courses
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{course.title}</h1>
            {course.is_published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}
            {course.is_demo && <Badge>Demo</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {course.created_by_name ? `By ${course.created_by_name}` : "IccheGhuri demo content"}
            {course.is_published && (
              <>
                {" · "}
                <Link href={`/learn/${course.slug}`} className="font-medium text-brand-600 hover:underline">
                  View as a student
                </Link>
              </>
            )}
          </p>
        </div>
        {course.can_edit && <PublishToggle course={course} onChange={setCourse} />}
      </header>

      {!course.can_edit && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <Lock className="size-4" aria-hidden /> Read only. Only the course&apos;s verified author or an admin can change it.
          </span>
        </Alert>
      )}

      {/* Not keyed by updated_at: toggling "Visible to students" must not throw away unsaved edits in this form. */}
      <CourseForm course={course} onChange={setCourse} />
      <Lessons course={course} onChange={setCourse} />
      {course.can_edit && <DangerZone course={course} />}
    </div>
  );
}

function PublishToggle({ course, onChange }: { course: StaffCourseDetail; onChange: (c: StaffCourseDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      onChange(
        await api<StaffCourseDetail>(`/teacher/courses/${course.id}`, {
          method: "PATCH",
          body: { is_published: next },
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change publishing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0 rounded-card border border-line bg-white p-3 sm:w-64">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="publish" className="text-sm font-medium">
          Visible to students
        </label>
        <Switch id="publish" checked={course.is_published} onCheckedChange={toggle} disabled={busy} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {course.is_published
          ? `${levelName(course.level)} students can see it.`
          : `Publishing notifies ${levelName(course.level).toLowerCase()} students once.`}
      </p>
      {error && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function levelName(level: EducationLevel) {
  return LEVELS.find((l) => l.value === level)?.label ?? level;
}

function CourseForm({ course, onChange }: { course: StaffCourseDetail; onChange: (c: StaffCourseDetail) => void }) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [level, setLevel] = useState<EducationLevel>(course.level);
  const [category, setCategory] = useState(course.category);
  const [hours, setHours] = useState(String(course.estimated_hours));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const ro = !course.can_edit;
  const categories = COURSE_CATEGORIES.some((c) => c.value === course.category)
    ? COURSE_CATEGORIES
    : [...COURSE_CATEGORIES, { value: course.category, label: course.category.replace(/_/g, " ") }];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    setSaved(false);
    try {
      const next = await api<StaffCourseDetail>(`/teacher/courses/${course.id}`, {
        method: "PATCH",
        body: {
          title,
          description,
          level,
          category,
          estimated_hours: hours === "" ? 1 : Number(hours),
        },
      });
      onChange(next);
      setTitle(next.title);
      setDescription(next.description);
      setLevel(next.level);
      setCategory(next.category);
      setHours(String(next.estimated_hours));
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fieldErrors());
        setError(err.message);
      } else setError("Could not save the course.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <h2 className="font-semibold">Course details</h2>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Field label="Title" htmlFor="title" error={fields.title}>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              required
              minLength={2}
              maxLength={200}
              disabled={ro}
              invalid={!!fields.title}
            />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Description" htmlFor="desc" optional error={fields.description}>
            <Textarea id="desc" rows={3} value={description} onChange={(e) => { setDescription(e.target.value); setSaved(false); }} maxLength={2000} disabled={ro} />
          </Field>
        </div>
        <Field
          label="Level"
          htmlFor="level"
          hint={
            course.is_published && level !== course.level
              ? `Students at ${levelName(course.level).toLowerCase()} level will stop seeing this course.`
              : undefined
          }
        >
          <Select
            id="level"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as EducationLevel);
              setSaved(false);
            }}
            disabled={ro}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="cat">
          <Select id="cat" value={category} onChange={(e) => { setCategory(e.target.value); setSaved(false); }} disabled={ro}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estimated hours" htmlFor="hours" error={fields.estimated_hours}>
          <Input id="hours" type="number" min={0.25} max={200} step={0.25} value={hours} onChange={(e) => { setHours(e.target.value); setSaved(false); }} disabled={ro} />
        </Field>
        {error && (
          <div className="sm:col-span-3">
            <Alert>{error}</Alert>
          </div>
        )}
        {!ro && (
          <div className="flex items-center gap-3 sm:col-span-3">
            <Button type="submit" loading={busy}>
              Save details
            </Button>
            {saved && (
              <span className="text-sm text-success" role="status">
                Saved
              </span>
            )}
          </div>
        )}
      </form>
    </Card>
  );
}

function Lessons({ course, onChange }: { course: StaffCourseDetail; onChange: (c: StaffCourseDetail) => void }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lessons = course.lessons;

  // The buttons that had focus get unmounted (confirm swap, deleted row); park focus on the list heading instead of <body>.
  const refocus = () => requestAnimationFrame(() => heading.current?.focus());

  async function run(fn: () => Promise<StaffCourseDetail>, focusAfter = false) {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setConfirmDelete(null);
      if (focusAfter) refocus();
    }
  }

  async function move(i: number, dir: -1 | 1) {
    const id = lessons[i].id;
    const ids = lessons.map((l) => l.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    await run(() =>
      api<StaffCourseDetail>(`/teacher/courses/${course.id}/lesson-order`, {
        method: "PUT",
        body: { lesson_ids: ids },
      }),
    );
    // Follow the moved lesson with focus; at the top/bottom that button is disabled, so use the other direction.
    requestAnimationFrame(() => {
      const pickBtn = (d: string) => document.querySelector<HTMLButtonElement>(`[data-lesson="${id}"][data-dir="${d}"]:not(:disabled)`);
      (pickBtn(dir < 0 ? "up" : "down") ?? pickBtn(dir < 0 ? "down" : "up") ?? heading.current)?.focus();
    });
  }

  return (
    <Card as="section" className="p-0">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
        <h2 ref={heading} tabIndex={-1} className="font-semibold outline-none">
          Lessons ({lessons.length})
        </h2>
        {course.can_edit && editing !== "new" && (
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add lesson
          </Button>
        )}
      </div>
      {error && (
        <div className="px-5 pt-3 sm:px-6">
          <Alert>{error}</Alert>
        </div>
      )}
      {lessons.length === 0 && editing !== "new" && <p className="px-5 py-6 text-sm text-muted sm:px-6">No lessons yet. Add one to be able to publish.</p>}
      <ol className="mt-3 divide-y divide-line border-t border-line">
        {lessons.map((l, i) => (
          <li key={l.id} className="px-5 py-3 sm:px-6">
            {editing === l.id ? (
              <LessonEditor
                courseId={course.id}
                lesson={l}
                onSaved={(c) => {
                  onChange(c);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    {l.duration_min} min
                    {l.colab_url && (
                      <>
                        {" · "}
                        <ExternalLink className="size-3" aria-hidden /> Colab
                      </>
                    )}
                    {!l.content_md.trim() && " · no content yet"}
                  </p>
                </div>
                {course.can_edit && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    {confirmDelete === l.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={busy}
                          onClick={() => run(() => api<StaffCourseDetail>(`/teacher/lessons/${l.id}`, { method: "DELETE" }), true)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          autoFocus
                          disabled={busy}
                          onClick={() => {
                            setConfirmDelete(null);
                            refocus();
                          }}
                        >
                          Keep
                        </Button>
                      </>
                    ) : (
                      <>
                        <IconButton label={`Move ${l.title} up`} busy={busy} disabled={i === 0} onClick={() => move(i, -1)} data-lesson={l.id} data-dir="up">
                          <ArrowUp className="size-4" />
                        </IconButton>
                        <IconButton label={`Move ${l.title} down`} busy={busy} disabled={i === lessons.length - 1} onClick={() => move(i, 1)} data-lesson={l.id} data-dir="down">
                          <ArrowDown className="size-4" />
                        </IconButton>
                        <IconButton label={`Edit ${l.title}`} busy={busy} onClick={() => setEditing(l.id)}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton label={`Delete ${l.title}`} busy={busy} onClick={() => setConfirmDelete(l.id)}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
        {editing === "new" && (
          <li className="px-5 py-4 sm:px-6">
            <LessonEditor
              courseId={course.id}
              onSaved={(c) => {
                onChange(c);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          </li>
        )}
      </ol>
    </Card>
  );
}

/** While `busy`, the button is aria-disabled (not `disabled`) so the focused button keeps focus during a request. */
function IconButton({
  label,
  children,
  busy,
  onClick,
  ...rest
}: {
  label: string;
  children: React.ReactNode;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  "data-lesson"?: string;
  "data-dir"?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-disabled={busy || undefined}
      onClick={busy ? undefined : onClick}
      className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-40 aria-disabled:opacity-40 sm:size-9"
      {...rest}
    >
      {children}
    </button>
  );
}

function LessonEditor({
  courseId,
  lesson,
  onSaved,
  onCancel,
}: {
  courseId: string;
  lesson?: StaffLesson;
  onSaved: (c: StaffCourseDetail) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [duration, setDuration] = useState(String(lesson?.duration_min ?? 10));
  const [colab, setColab] = useState(lesson?.colab_url ?? "");
  const [content, setContent] = useState(lesson?.content_md ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const prefix = lesson ? `l-${lesson.id}` : "l-new";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    // Send what was typed (0, 9999, ...) so the backend's validation message shows instead of a silent default.
    const body = {
      title,
      duration_min: duration === "" ? 10 : Number(duration),
      colab_url: colab.trim() || null,
      content_md: content,
    };
    try {
      onSaved(
        lesson
          ? await api<StaffCourseDetail>(`/teacher/lessons/${lesson.id}`, {
              method: "PATCH",
              body,
            })
          : await api<StaffCourseDetail>(`/teacher/courses/${courseId}/lessons`, { method: "POST", body }),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fieldErrors());
        setError(err.message);
      } else setError("Could not save the lesson.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-[1fr_140px]">
      <Field label="Lesson title" htmlFor={`${prefix}-title`} error={fields.title}>
        <Input
          id={`${prefix}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          invalid={!!fields.title}
          autoFocus
        />
      </Field>
      <Field label="Minutes" htmlFor={`${prefix}-min`} error={fields.duration_min}>
        <Input
          id={`${prefix}-min`}
          type="number"
          min={1}
          max={600}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          invalid={!!fields.duration_min}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Google Colab notebook" htmlFor={`${prefix}-colab`} optional hint="A https://colab.research.google.com/... link" error={fields.colab_url}>
          <Input
            id={`${prefix}-colab`}
            type="url"
            value={colab}
            onChange={(e) => setColab(e.target.value)}
            placeholder="https://colab.research.google.com/drive/..."
            invalid={!!fields.colab_url}
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">Content (Markdown)</p>
        <Tabs defaultValue="write" className="mt-1.5">
          <TabsList className="mb-0">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="mt-2">
            <label htmlFor={`${prefix}-md`} className="sr-only">
              Lesson content in Markdown
            </label>
            <Textarea
              id={`${prefix}-md`}
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={60000}
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted">{content.length.toLocaleString()} / 60,000 characters</p>
          </TabsContent>
          <TabsContent value="preview" className="mt-2 min-h-40 rounded-xl border border-line p-4">
            {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
          </TabsContent>
        </Tabs>
      </div>
      {error && (
        <div className="sm:col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" loading={busy}>
          {lesson ? "Save lesson" : "Add lesson"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DangerZone({ course }: { course: StaffCourseDetail }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  function cancel() {
    setConfirm(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/teacher/courses/${course.id}`, { method: "DELETE" });
      router.replace("/teacher/courses");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the course.");
      setBusy(false);
      cancel();
    }
  }

  return (
    <Card as="section" className="border-danger/30">
      <h2 className="font-semibold text-danger">Delete course</h2>
      <p className="mt-1 text-sm text-muted">Only possible while no student has started it. Unpublish it instead if students are learning from it.</p>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {confirm ? (
          <>
            <Button size="sm" variant="danger" onClick={remove} loading={busy}>
              Yes, delete &ldquo;{course.title.slice(0, 40)}&rdquo;
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={busy} autoFocus>
              Cancel
            </Button>
          </>
        ) : (
          <Button ref={trigger} size="sm" variant="secondary" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" /> Delete course
          </Button>
        )}
      </div>
    </Card>
  );
}
