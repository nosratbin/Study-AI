"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ClipboardList, Clock, FlaskConical, Plus } from "lucide-react";
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Input, LoadError, PageHeader, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { LEVELS, PROJECT_STATUS, formatDay, type Challenge, type EducationLevel, type Project } from "@/lib/types";

export default function ProjectLabPage() {
  const { user } = useAuth();
  if (user && user.role !== "student") return <StaffLanding />;
  return <StudentLab />;
}

function StaffLanding() {
  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Project Lab" subtitle="Students build projects in Google Colab or GitHub and submit them for review." />
      <Card className="p-6">
        <p className="text-muted">Submitted projects are waiting in the review queue.</p>
        <ButtonLink href="/projects/review" className="mt-4">
          <ClipboardList className="size-4" aria-hidden /> Open review queue
        </ButtonLink>
      </Card>
    </div>
  );
}

function StudentLab() {
  const [level, setLevel] = useState<EducationLevel | "all">("all");
  const challenges = useApi<Challenge[]>(`/projects/challenges${level === "all" ? "" : `?level=${level}`}`);
  const mine = useApi<Project[]>("/projects");
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        title="Project Lab"
        subtitle="Build real AI projects in Google Colab or GitHub, write up what you learned, and get feedback from a teacher."
      >
        {!creating && (
          <Button variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> Own project idea
          </Button>
        )}
      </PageHeader>

      {creating && <NewProject onCancel={() => setCreating(false)} />}

      <section aria-labelledby="my-projects" className="space-y-3">
        <h2 id="my-projects" className="text-lg font-semibold">My projects</h2>
        {mine.error ? (
          <LoadError message={mine.error.message} onRetry={mine.reload} />
        ) : !mine.data ? (
          <Spinner />
        ) : !mine.data.length ? (
          <EmptyState icon={<FlaskConical className="size-7" />} title="No projects yet">
            Pick a challenge below to get started, or add your own idea.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {mine.data.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="block h-full rounded-card border border-line bg-white p-5 shadow-card transition-colors hover:border-brand-200">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
                    {p.is_public && <Badge>On public passport</Badge>}
                  </div>
                  <p className="mt-2 font-semibold">{p.title}</p>
                  <p className="text-sm text-muted">
                    {p.challenge ? p.challenge.title : "Own idea"} · updated {formatDay(p.updated_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="challenges" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="challenges" className="text-lg font-semibold">Challenges</h2>
          <div role="group" aria-label="Filter by level" className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1">
            {([{ value: "all", label: "All levels" }, ...LEVELS] as { value: EducationLevel | "all"; label: string }[]).map((l) => (
              <button
                key={l.value}
                aria-pressed={level === l.value}
                onClick={() => setLevel(l.value)}
                className={clsx("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium", level === l.value ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink")}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {challenges.error ? (
          <LoadError message={challenges.error.message} onRetry={challenges.reload} />
        ) : !challenges.data ? (
          <Spinner />
        ) : !challenges.data.length ? (
          <EmptyState icon={<FlaskConical className="size-7" />} title="No challenges for this level yet" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {challenges.data.map((c) => (
              <li key={c.id}>
                <Link href={`/projects/challenges/${c.slug}`} className="flex h-full flex-col rounded-card border border-line bg-white p-5 shadow-card transition-colors hover:border-brand-200">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="brand">{LEVELS.find((l) => l.value === c.level)?.label}</Badge>
                    {c.is_demo && <Badge>Demo</Badge>}
                  </div>
                  <p className="mt-2 font-semibold">{c.title}</p>
                  <p className="mt-1 flex-1 text-sm text-muted">{c.summary}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="size-3.5" aria-hidden /> About {c.estimated_hours} h · {c.skills.join(", ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NewProject({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const p = await api<Project>("/projects", { method: "POST", body: { title } });
      router.push(`/projects/${p.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldErrors().title ?? err.message : "Could not create the project.");
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={create} className="space-y-4">
        <Field label="Project title" htmlFor="new-title" hint="You can add links and a write-up on the next page." error={error ?? undefined}>
          <Input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={200} required invalid={!!error} autoFocus />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" loading={busy}>Create project</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
