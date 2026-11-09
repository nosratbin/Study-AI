"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Alert, Badge, Button, ButtonLink, Card, LoadError, Spinner } from "@/components/ui";
import { Markdown } from "@/components/learning/markdown";
import { SaveLessonToDocs } from "@/components/google/google-actions";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { levelLabel, type Lesson, type ProgressResult } from "@/lib/types";

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const { data: lesson, error, reload, setData } = useApi<Lesson>(`/lessons/${encodeURIComponent(id)}`);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const marked = useRef<string | null>(null);

  // Opening a lesson marks it in progress (the backend never downgrades a completed lesson).
  useEffect(() => {
    if (!lesson || !isStudent || lesson.status !== "not_started" || marked.current === lesson.id) return;
    marked.current = lesson.id;
    api<ProgressResult>("/learning/progress", { method: "POST", body: { lesson_id: lesson.id, status: "in_progress" } })
      .then((p) => setData((l) => (l && l.id === p.lesson_id ? { ...l, status: p.status } : l)))
      .catch(() => {
        /* progress tracking is best-effort here; completing the lesson retries explicitly */
      });
  }, [lesson, isStudent, setData]);

  async function complete() {
    if (!lesson) return;
    setBusy(true);
    setMsg(null);
    try {
      const p = await api<ProgressResult>("/learning/progress", { method: "POST", body: { lesson_id: lesson.id, status: "completed" } });
      setData({ ...lesson, status: p.status });
      if (p.next_lesson_id) router.push(`/lessons/${p.next_lesson_id}`);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Could not save your progress.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <LoadError message={error.status === 404 ? "This lesson does not exist or is not published." : error.message} onRetry={reload} />;
  if (!lesson) return <Spinner label="Loading lesson…" />;

  const done = lesson.status === "completed";
  const tutorHref = `/tutor?lesson=${lesson.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <Link href={`/learn/${lesson.course_slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {lesson.course_title}
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>
            Lesson {lesson.lesson_number} of {lesson.lesson_count}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {lesson.duration_min} min
          </span>
          <Badge tone="brand">{levelLabel(lesson.course_level)}</Badge>
          {lesson.is_demo && <Badge>Demo</Badge>}
          {done && (
            <Badge tone="success">
              <CheckCircle2 className="size-3" aria-hidden /> Completed
            </Badge>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>
      </header>

      <Card as="article" className="p-5 sm:p-8">
        <Markdown>{lesson.content_md}</Markdown>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={tutorHref} className="flex items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-4 transition-colors hover:bg-brand-100">
          <Bot className="size-8 shrink-0 text-brand-500" aria-hidden />
          <span>
            <span className="block font-semibold">Ask the AI Tutor</span>
            <span className="block text-sm text-muted">Stuck? Get a step-by-step explanation of this lesson.</span>
          </span>
        </Link>
        {lesson.colab_url && (
          <a href={lesson.colab_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-card border border-line bg-white p-4 transition-colors hover:bg-surface">
            <ExternalLink className="size-7 shrink-0 text-muted" aria-hidden />
            <span>
              <span className="block font-semibold">Practise in Google Colab</span>
              <span className="block text-sm text-muted">Opens the notebook in a new tab.</span>
            </span>
          </a>
        )}
      </div>

      <SaveLessonToDocs lessonId={lesson.id} />

      {msg && <Alert>{msg}</Alert>}

      <nav className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between" aria-label="Lesson navigation">
        {lesson.prev_lesson_id ? (
          <ButtonLink href={`/lessons/${lesson.prev_lesson_id}`} variant="secondary">
            <ArrowLeft className="size-4" aria-hidden /> Previous
          </ButtonLink>
        ) : (
          <span />
        )}
        {isStudent && !done ? (
          <Button onClick={complete} loading={busy}>
            <CheckCircle2 className="size-4" aria-hidden />
            {lesson.next_lesson_id ? "Mark complete & continue" : "Mark complete"}
          </Button>
        ) : lesson.next_lesson_id ? (
          <ButtonLink href={`/lessons/${lesson.next_lesson_id}`}>
            Next lesson <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        ) : (
          <ButtonLink href={`/learn/${lesson.course_slug}`} variant="secondary">
            Back to course
          </ButtonLink>
        )}
      </nav>
    </div>
  );
}
