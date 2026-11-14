"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarPlus, ChevronLeft, ChevronRight, Flame, Lightbulb, Pause, Play, Plus, RotateCcw, Timer, Trash2 } from "lucide-react";
import { Alert, Button, Card, Field, Input, LoadError, PageHeader, Progress, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { GoogleEvent, PlannerSummary, StudyTask, TaskSuggestion } from "@/lib/types";

const DAY_MS = 86_400_000;

/** Today's date in Bangladesh as YYYY-MM-DD. */
function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
}
function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}
function mondayOf(iso: string): string {
  const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -dow);
}
function dayLabel(iso: string): { weekday: string; date: string } {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(d),
    date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d),
  };
}

export default function PlannerPage() {
  const [today] = useState(dhakaToday);
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const weekEnd = addDays(weekStart, 6);
  const tasks = useApi<StudyTask[]>(`/planner/tasks?from=${weekStart}&to=${weekEnd}`);
  const summary = useApi<PlannerSummary>("/planner/summary");
  const suggestions = useApi<TaskSuggestion[]>("/planner/suggestions");
  const [adding, setAdding] = useState<{ due_on: string; title?: string; lesson_id?: string; minutes?: number } | null>(null);

  function refresh() {
    tasks.reload();
    summary.reload();
    suggestions.reload();
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const s = summary.data;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Study Planner" subtitle="Plan your week, keep a steady streak, and use the focus timer for distraction-free study.">
        <Button onClick={() => setAdding({ due_on: today >= weekStart && today <= weekEnd ? today : weekStart })}>
          <Plus className="size-4" aria-hidden /> Add task
        </Button>
      </PageHeader>

      {s && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-muted">This week</p>
            <p className="text-2xl font-bold">{s.tasks_done} / {s.tasks_total} tasks</p>
            <Progress value={s.tasks_total ? (s.tasks_done / s.tasks_total) * 100 : 0} label="Tasks done this week" />
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted">Study time done</p>
            <p className="text-2xl font-bold">{Math.round(s.done_minutes / 6) / 10} h <span className="text-base font-normal text-muted">of {Math.round(s.planned_minutes / 6) / 10} h</span></p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted">Streak</p>
            <p className="flex items-center gap-1.5 text-2xl font-bold"><Flame className="size-6 text-brand-500" aria-hidden /> {s.streak_days} day{s.streak_days === 1 ? "" : "s"}</p>
          </Card>
        </div>
      )}

      {adding && <TaskForm key={JSON.stringify(adding)} initial={adding} onCancel={() => setAdding(null)} onSaved={() => { setAdding(null); refresh(); }} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Week" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week"><ChevronLeft className="size-4" aria-hidden /></Button>
            <p className="font-semibold">{dayLabel(weekStart).date} – {dayLabel(weekEnd).date}</p>
            <div className="flex gap-1">
              {weekStart !== mondayOf(today) && <Button size="sm" variant="ghost" onClick={() => setWeekStart(mondayOf(today))}>This week</Button>}
              <Button size="sm" variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week"><ChevronRight className="size-4" aria-hidden /></Button>
            </div>
          </div>
          {tasks.error ? (
            <LoadError message={tasks.error.message} onRetry={tasks.reload} />
          ) : !tasks.data ? (
            <Spinner />
          ) : (
            <ol className="space-y-2">
              {days.map((d) => {
                const items = tasks.data!.filter((t) => t.due_on === d);
                const l = dayLabel(d);
                return (
                  <li key={d} className={clsx("rounded-xl border bg-card p-3", d === today ? "border-brand-200 ring-1 ring-brand-200" : "border-line")}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {l.weekday} <span className="font-normal text-muted">{l.date}</span>
                        {d === today && <span className="ml-2 text-xs font-medium text-brand-600">Today</span>}
                      </p>
                      <button className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface hover:text-ink" onClick={() => setAdding({ due_on: d })} aria-label={`Add task on ${l.weekday} ${l.date}`}>
                        <Plus className="size-4" aria-hidden />
                      </button>
                    </div>
                    {items.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {items.map((t) => <TaskRow key={t.id} t={t} past={d < today} onChange={refresh} />)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          <FocusTimer />
          <Card className="space-y-3 p-5">
            <p className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-brand-500" aria-hidden /> Up next</p>
            {suggestions.error ? (
              <p className="text-sm text-muted">Couldn&apos;t load suggestions.</p>
            ) : !suggestions.data ? (
              <Spinner />
            ) : !suggestions.data.length ? (
              <p className="text-sm text-muted">You&apos;re all planned. <Link href="/learn" className="text-brand-600 hover:underline">Browse courses</Link> for more.</p>
            ) : (
              <ul className="space-y-2">
                {suggestions.data.map((sg) => (
                  <li key={sg.lesson_id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{sg.title}</p>
                      <p className="text-xs text-muted">{sg.course_title} · {sg.duration_min} min</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setAdding({ due_on: today, title: sg.title, lesson_id: sg.lesson_id, minutes: Math.max(5, sg.duration_min) })}>
                      Plan
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TaskForm({ initial, onCancel, onSaved }: { initial: { due_on: string; title?: string; lesson_id?: string; minutes?: number }; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: initial.title ?? "", due_on: initial.due_on, planned_minutes: String(initial.minutes ?? 30) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/planner/tasks", { method: "POST", body: { title: form.title, due_on: form.due_on, planned_minutes: Number(form.planned_minutes), lesson_id: initial.lesson_id ?? null } });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else setError("Could not save the task.");
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={save} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[1fr_11rem_8rem]">
          <Field label="Task" htmlFor="t-title" error={errors.title}>
            <Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={2} maxLength={200} placeholder="e.g. Revise chapter 3" invalid={!!errors.title} autoFocus />
          </Field>
          <Field label="Day" htmlFor="t-day" error={errors.due_on}>
            <Input id="t-day" type="date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} required invalid={!!errors.due_on} />
          </Field>
          <Field label="Minutes" htmlFor="t-min" error={errors.planned_minutes}>
            <Input id="t-min" type="number" min={5} max={480} step={5} value={form.planned_minutes} onChange={(e) => setForm({ ...form, planned_minutes: e.target.value })} required invalid={!!errors.planned_minutes} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={busy}>Add to plan</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function TaskRow({ t, past, onChange }: { t: StudyTask; past: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reminding, setReminding] = useState(false);
  const done = t.status === "done";

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onChange();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false); // the row keeps its key after a reload, so always unlock it
    }
  }

  return (
    <li className="rounded-lg bg-surface px-3 py-2">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-brand-500"
          checked={done}
          disabled={busy}
          onChange={() => act(() => api(`/planner/tasks/${t.id}`, { method: "PATCH", body: { status: done ? "todo" : "done" } }))}
          aria-label={`Mark "${t.title}" ${done ? "not done" : "done"}`}
        />
        <div className="min-w-0 flex-1">
          <p className={clsx("text-sm font-medium", done && "text-muted line-through")}>{t.title}</p>
          <p className="text-xs text-muted">
            {t.planned_minutes} min
            {t.lesson_id && (
              <>
                {" · "}
                <Link href={`/lessons/${t.lesson_id}`} className="text-brand-600 hover:underline">Open lesson</Link>
              </>
            )}
          </p>
        </div>
        {!done && !past && (
          <button className="grid size-8 place-items-center rounded-lg text-muted hover:bg-card hover:text-ink" onClick={() => setReminding(!reminding)} aria-label="Add to Google Calendar" title="Add to Google Calendar">
            <CalendarPlus className="size-4" aria-hidden />
          </button>
        )}
        <button className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger" disabled={busy} onClick={() => act(() => api(`/planner/tasks/${t.id}`, { method: "DELETE" }))} aria-label={`Delete "${t.title}"`}>
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      {reminding && <CalendarReminder t={t} onClose={() => setReminding(false)} />}
    </li>
  );
}

function CalendarReminder({ t, onClose }: { t: StudyTask; onClose: () => void }) {
  const [time, setTime] = useState("19:00");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "error" | "success"; text: React.ReactNode } | null>(null);

  async function add() {
    setBusy(true);
    setResult(null);
    try {
      // The task id doubles as the request id: adding the same task again updates its event instead of duplicating it.
      const ev = await api<GoogleEvent>("/google/calendar/reminder", {
        method: "POST",
        body: { title: t.title, kind: "study", starts_at: `${t.due_on}T${time}:00+06:00`, duration_min: Math.max(15, t.planned_minutes), remind_minutes: 30, request_id: t.id },
      });
      setResult({
        tone: "success",
        text: (
          <>
            {ev.created ? "Added to" : "Updated in"} your IccheGhuri calendar.{" "}
            {ev.html_link && <a href={ev.html_link} target="_blank" rel="noopener noreferrer" className="underline">Open in Google Calendar</a>}
          </>
        ),
      });
    } catch (e) {
      const needsConnect = e instanceof ApiError && ["google_not_connected", "google_scope_missing", "google_reconnect_required"].includes(e.code);
      setResult({
        tone: "error",
        text: needsConnect ? (
          <>
            {(e as ApiError).message} <Link href="/google" className="underline">Connect Google Calendar</Link>
          </>
        ) : e instanceof ApiError ? e.message : "Could not add the reminder.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 border-t border-line pt-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Start time (Bangladesh)" htmlFor={`rt-${t.id}`}>
          <Input id={`rt-${t.id}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 w-32" />
        </Field>
        <Button size="sm" loading={busy} onClick={add}>Add to Google Calendar</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
      {result && <Alert tone={result.tone}>{result.text}</Alert>}
    </div>
  );
}

const MODES = { focus: { label: "Focus", secs: 25 * 60 }, break: { label: "Break", secs: 5 * 60 } } as const;

function FocusTimer() {
  const [mode, setMode] = useState<keyof typeof MODES>("focus");
  const [left, setLeft] = useState<number>(MODES.focus.secs);
  const [endsAt, setEndsAt] = useState<number | null>(null); // wall-clock end, so background tabs stay accurate
  const [sessions, setSessions] = useState(0);
  const running = endsAt !== null;

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (remaining > 0) {
        setLeft(remaining);
        return;
      }
      // Phase finished: switch focus <-> break and pause so the student starts the next one deliberately.
      const next = mode === "focus" ? "break" : "focus";
      if (mode === "focus") setSessions((n) => n + 1);
      setEndsAt(null);
      setMode(next);
      setLeft(MODES[next].secs);
    }, 500);
    return () => clearInterval(id);
  }, [endsAt, mode]);

  function toggle() {
    setEndsAt(running ? null : Date.now() + left * 1000);
  }

  function pick(m: keyof typeof MODES) {
    setEndsAt(null);
    setMode(m);
    setLeft(MODES[m].secs);
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <Card className="space-y-4 p-5 text-center">
      <p className="flex items-center gap-2 text-left font-semibold"><Timer className="size-4 text-brand-500" aria-hidden /> Focus timer</p>
      <div role="group" aria-label="Timer mode" className="flex justify-center gap-1 rounded-xl bg-surface p-1">
        {(Object.keys(MODES) as (keyof typeof MODES)[]).map((m) => (
          <button key={m} aria-pressed={mode === m} onClick={() => pick(m)} className={clsx("flex-1 rounded-lg px-3 py-1.5 text-sm font-medium", mode === m ? "bg-card text-brand-700 shadow-sm" : "text-muted")}>
            {MODES[m].label} {MODES[m].secs / 60}m
          </button>
        ))}
      </div>
      <p className="font-mono text-5xl font-bold tabular-nums" role="timer" aria-live="off">{mm}:{ss}</p>
      <div className="flex justify-center gap-2">
        <Button onClick={toggle}>
          {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} {running ? "Pause" : "Start"}
        </Button>
        <Button variant="secondary" onClick={() => pick(mode)} aria-label="Reset timer"><RotateCcw className="size-4" aria-hidden /></Button>
      </div>
      <p className="text-xs text-muted">{sessions ? `${sessions} focus session${sessions === 1 ? "" : "s"} done today. ` : ""}Take the break: short rests help you remember more.</p>
    </Card>
  );
}
