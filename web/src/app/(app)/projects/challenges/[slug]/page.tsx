"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { Alert, Badge, Button, Card, LoadError, Spinner } from "@/components/ui";
import { Markdown } from "@/components/learning/markdown";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { LEVELS, type ChallengeDetail, type Project } from "@/lib/types";

export default function ChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const c = useApi<ChallengeDetail>(`/projects/challenges/${encodeURIComponent(slug)}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!c.data) return;
    setBusy(true);
    setError(null);
    try {
      const p = await api<Project>("/projects", { method: "POST", body: { title: c.data.title, challenge_id: c.data.id } });
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start the project.");
      setBusy(false);
    }
  }

  if (c.error) return <LoadError message={c.error.message} onRetry={c.reload} />;
  if (!c.data) return <Spinner />;
  const ch = c.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Project Lab
      </Link>
      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{LEVELS.find((l) => l.value === ch.level)?.label}</Badge>
          {ch.is_demo && <Badge>Demo</Badge>}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{ch.title}</h1>
        <p className="text-muted">{ch.summary}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Clock className="size-4" aria-hidden /> About {ch.estimated_hours} hours · {ch.skills.join(", ")}
        </p>
      </header>

      <Card className="p-6 sm:p-8">
        <Markdown>{ch.brief_md}</Markdown>
      </Card>

      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={start} loading={busy}>Start this project</Button>
        {ch.starter_url && (
          <a href={ch.starter_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-semibold hover:bg-surface">
            Open a new Colab notebook <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}
