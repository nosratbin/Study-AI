"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, Circle, GraduationCap, Sparkles, Star, Trophy } from "lucide-react";
import { Alert, Badge, Button, Card, LoadError, Textarea } from "@/components/ui";
import { Markdown } from "@/components/learning/markdown";
import { Progress } from "@/components/vengeance/progress";
import { Skeleton } from "@/components/vengeance/skeleton";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDay, levelLabel, type CareerDetail, type CareerPlan } from "@/lib/types";

export default function CareerPage() {
  const { slug } = useParams<{ slug: string }>();
  // Keyed by slug so every piece of local state (goal note, AI plan) resets when moving between careers.
  return <CareerView key={slug} slug={slug} />;
}

function CareerView({ slug }: { slug: string }) {
  const [c, setC] = useState<CareerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    () => api<CareerDetail>(`/careers/${slug}`).then(setC, (e) => setError(e instanceof ApiError ? e.message : "Could not load this career.")),
    [slug],
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
  if (!c)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );

  const have = c.skills.filter((s) => s.have).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/career" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All careers
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{c.title}</h1>
            {c.is_demo && <Badge>Demo</Badge>}
          </div>
          <p className="mt-1 text-muted">
            {c.field} · {c.summary}
          </p>
        </div>
        <div className="w-full shrink-0 rounded-card border border-line bg-card p-4 sm:w-56">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Your match</span>
            <span className="text-2xl font-bold text-brand-600">{c.match}%</span>
          </div>
          <Progress value={c.match} className="mt-2" aria-label={`Match ${c.match}%`} />
        </div>
      </header>

      {c.reasons.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {c.reasons.map((r) => (
            <li key={r} className="rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success">
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card as="section">
            <h2 className="font-semibold">About this career</h2>
            <Markdown className="mt-3 text-sm">{c.description_md}</Markdown>
            {c.education_paths.length > 0 && (
              <>
                <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="size-4 text-brand-500" aria-hidden /> Typical study paths
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                  {c.education_paths.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">General guidance only. Check admission rules with each institution.</p>
              </>
            )}
          </Card>

          <Card as="section">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Skill gap</h2>
              <span className="text-sm text-muted">
                {have} of {c.skills.length} skills shown
              </span>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {c.skills.map((s) => (
                <li key={s.name} className={cn("flex items-start gap-2.5 rounded-xl border p-3", s.have ? "border-success/20 bg-success-50" : "border-line")}>
                  {s.have ? (
                    <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-success" aria-label="You have this" />
                  ) : (
                    <Circle className="mt-0.5 size-4.5 shrink-0 text-muted" aria-label="To build" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-muted">{s.evidence ?? "To build"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card as="section">
            <h2 className="font-semibold">Courses on IccheGhuri for this path</h2>
            {c.courses.length ? (
              <ul className="mt-3 divide-y divide-line">
                {c.courses.map((k) => (
                  <li key={k.slug} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/learn/${k.slug}`} className="min-w-0 truncate text-sm font-medium hover:text-brand-600">
                        {k.title}
                      </Link>
                      <div className="flex shrink-0 gap-1">
                        <Badge tone="brand">{levelLabel(k.level)}</Badge>
                        {k.is_demo && <Badge>Demo</Badge>}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Progress value={k.percent} className="h-1.5" aria-label={`${k.title} ${k.percent}%`} />
                      <span className="w-20 shrink-0 text-right text-xs text-muted">
                        {k.status === "completed" ? "Completed" : k.status === "in_progress" ? `${k.percent}%` : "Not started"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No matching courses are published yet.</p>
            )}
          </Card>

          <AiPlan slug={c.slug} />
        </div>

        <aside className="space-y-6">
          <GoalCard key={`${c.is_goal}`} career={c} onChange={setC} />

          <Card as="section">
            <h2 className="flex items-center gap-2 font-semibold">
              <Trophy className="size-4 text-brand-500" aria-hidden /> Verified opportunities
            </h2>
            {c.opportunities.length ? (
              <ul className="mt-3 divide-y divide-line">
                {c.opportunities.map((o) => (
                  <li key={o.id} className="py-2.5">
                    <Link href={`/opportunities-hub/${o.id}`} className="text-sm font-medium hover:text-brand-600">
                      {o.title}
                    </Link>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      {o.category_label}
                      {o.deadline && (
                        <>
                          <CalendarClock className="size-3" aria-hidden /> {formatDay(o.deadline)}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No verified opportunities are open right now. We only list ones an admin has checked.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function GoalCard({ career: c, onChange }: { career: CareerDetail; onChange: (c: CareerDetail) => void }) {
  const [note, setNote] = useState(c.goal_note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      onChange(
        await api<CareerDetail>(`/careers/${c.slug}/goal`, {
          method: "PUT",
          body: { note: note.trim() || null },
        }),
      );
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save your goal.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/careers/${c.slug}/goal`, { method: "DELETE" });
      onChange({ ...c, is_goal: false, goal_note: null });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not remove your goal.");
      setBusy(false);
    }
  }

  return (
    <Card as="section" className={cn(c.is_goal && "border-brand-200")}>
      <h2 className="flex items-center gap-2 font-semibold">
        <Star className={cn("size-4 text-brand-500", c.is_goal && "fill-brand-500")} aria-hidden />
        {c.is_goal ? "This is one of your goals" : "Make this a goal"}
      </h2>
      <p className="mt-1 text-xs text-muted">You can keep up to 3 career goals. Only you can see them.</p>
      <label htmlFor="goal-note" className="mt-3 block text-sm font-medium">
        Why this career? <span className="font-normal text-muted">(optional)</span>
      </label>
      <Textarea
        id="goal-note"
        rows={3}
        maxLength={1000}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        className="mt-1.5"
      />
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} loading={busy}>
          {c.is_goal ? "Save note" : "Save as goal"}
        </Button>
        {c.is_goal && (
          <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
            Remove goal
          </Button>
        )}
        {saved && (
          <span className="text-xs text-success" role="status">
            Saved
          </span>
        )}
      </div>
    </Card>
  );
}

function AiPlan({ slug }: { slug: string }) {
  const [plan, setPlan] = useState<CareerPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    setError(null);
    try {
      setPlan(await api<CareerPlan>(`/careers/${slug}/plan`, { method: "POST" }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not make a plan right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-brand-500" aria-hidden /> Your next steps
          </h2>
          <p className="mt-0.5 text-sm text-muted">A short AI study plan based on your skill gap and IccheGhuri courses.</p>
        </div>
        <Button size="sm" variant={plan ? "secondary" : "primary"} onClick={make} loading={busy}>
          {plan ? "Make a new plan" : "Make my plan"}
        </Button>
      </div>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {busy && !plan && (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}
      <div aria-live="polite">
        {plan && (
          <>
            <ol className="mt-4 space-y-3">
              {plan.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-sm text-muted">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-xs text-muted">{plan.note}</p>
          </>
        )}
      </div>
    </Card>
  );
}
