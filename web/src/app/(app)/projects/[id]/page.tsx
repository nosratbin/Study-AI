"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Lock, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input, LoadError, Spinner, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { PROJECT_STATUS, formatDay, type AIFeedback, type Project } from "@/lib/types";

const MIN_DOC = 80;

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const p = useApi<Project>(`/projects/${id}`);
  if (p.error) return <LoadError message={p.error.message} onRetry={p.reload} />;
  if (!p.data) return <Spinner />;
  return <Editor key={p.data.id} project={p.data} onChange={(np) => p.setData(np)} />;
}

function Editor({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: project.title,
    description: project.description,
    repo_url: project.repo_url ?? "",
    colab_url: project.colab_url ?? "",
    documentation: project.documentation ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ai, setAi] = useState<AIFeedback | null>(null);
  const locked = project.status === "submitted";
  const dirty =
    form.title !== project.title || form.description !== project.description || form.repo_url !== (project.repo_url ?? "") ||
    form.colab_url !== (project.colab_url ?? "") || form.documentation !== (project.documentation ?? "");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }

  async function run(label: string, fn: () => Promise<Project | void>, ok?: string) {
    setBusy(label);
    setMsg(null);
    try {
      const np = await fn();
      if (np) onChange(np);
      if (ok) setMsg({ tone: "success", text: ok });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors());
        setMsg({ tone: "error", text: e.message });
      } else setMsg({ tone: "error", text: "Something went wrong. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    api<Project>(`/projects/${project.id}`, {
      method: "PATCH",
      body: { ...form, repo_url: form.repo_url.trim() || null, colab_url: form.colab_url.trim() || null, documentation: form.documentation.trim() || null },
    });

  async function submit() {
    await run("submit", async () => {
      if (dirty) await save();
      return api<Project>(`/projects/${project.id}/submit`, { method: "POST" });
    }, "Submitted. A teacher will review it and leave feedback here.");
  }

  async function remove() {
    if (!window.confirm("Delete this project? This can't be undone.")) return;
    setBusy("delete");
    try {
      await api(`/projects/${project.id}`, { method: "DELETE" });
      router.replace("/projects");
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Could not delete." });
      setBusy(null);
    }
  }

  async function askAI() {
    setBusy("ai");
    setMsg(null);
    try {
      if (dirty) onChange(await save());
      setAi(await api<AIFeedback>(`/projects/${project.id}/ai-feedback`, { method: "POST" }));
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "AI suggestions are unavailable right now." });
    } finally {
      setBusy(null);
    }
  }

  const docLen = form.documentation.trim().length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Project Lab
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={PROJECT_STATUS[project.status].tone}>{PROJECT_STATUS[project.status].label}</Badge>
          {project.challenge && (
            <Link href={`/projects/challenges/${project.challenge.slug}`} className="text-sm text-brand-600 hover:underline">
              Challenge: {project.challenge.title}
            </Link>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{project.title}</h1>
      </header>

      {project.status === "reviewed" && project.feedback && (
        <Card className="space-y-2 border-success/30 p-5">
          <p className="font-semibold">
            Teacher feedback{project.reviewer_name ? ` from ${project.reviewer_name}` : ""}
            {project.reviewed_at ? ` · ${formatDay(project.reviewed_at)}` : ""}
          </p>
          {project.score !== null && <p className="text-sm text-muted">Score: {project.score} / 100</p>}
          <p className="whitespace-pre-wrap">{project.feedback}</p>
          <p className="text-xs text-muted">Editing the project moves it back to draft so you can submit an improved version.</p>
        </Card>
      )}

      {locked && (
        <Alert tone="success">
          <span className="inline-flex items-center gap-1.5"><Lock className="size-4" aria-hidden /> Submitted{project.submitted_at ? ` on ${formatDay(project.submitted_at)}` : ""}.</span>{" "}
          Withdraw it if you need to make changes before a teacher reviews it.
        </Alert>
      )}

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <Card className="space-y-5 p-5 sm:p-6">
        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} disabled={locked} maxLength={200} invalid={!!errors.title} />
        </Field>
        <Field label="Short description" htmlFor="description" optional error={errors.description}>
          <Input id="description" value={form.description} onChange={(e) => set("description", e.target.value)} disabled={locked} maxLength={1000} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Google Colab link" htmlFor="colab_url" optional error={errors.colab_url} hint='Set sharing to "Anyone with the link can view".'>
            <Input id="colab_url" type="url" inputMode="url" placeholder="https://colab.research.google.com/…" value={form.colab_url} onChange={(e) => set("colab_url", e.target.value)} disabled={locked} invalid={!!errors.colab_url} />
          </Field>
          <Field label="GitHub repository" htmlFor="repo_url" optional error={errors.repo_url}>
            <Input id="repo_url" type="url" inputMode="url" placeholder="https://github.com/you/project" value={form.repo_url} onChange={(e) => set("repo_url", e.target.value)} disabled={locked} invalid={!!errors.repo_url} />
          </Field>
        </div>
        <Field
          label="Write-up"
          htmlFor="documentation"
          error={errors.documentation}
          hint={`What it does, how you built it, what was hard and what you learned. ${docLen < MIN_DOC ? `At least ${MIN_DOC} characters to submit (${docLen} so far).` : ""}`}
        >
          <Textarea id="documentation" rows={10} value={form.documentation} onChange={(e) => set("documentation", e.target.value)} disabled={locked} maxLength={20000} invalid={!!errors.documentation} />
        </Field>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-brand-500"
            checked={project.is_public}
            disabled={!!busy}
            onChange={(e) => run("public", () => api<Project>(`/projects/${project.id}`, { method: "PATCH", body: { is_public: e.target.checked } }))}
          />
          <span>
            Show on my public Skill Passport
            <span className="block text-muted">Only submitted or reviewed projects appear there, and only if you turn sharing on.</span>
          </span>
        </label>

        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          {locked ? (
            <Button variant="secondary" loading={busy === "withdraw"} onClick={() => run("withdraw", () => api<Project>(`/projects/${project.id}/withdraw`, { method: "POST" }), "Withdrawn. You can edit it again.")}>
              Withdraw submission
            </Button>
          ) : (
            <>
              <Button loading={busy === "submit"} disabled={!!busy} onClick={submit}>Submit for review</Button>
              <Button variant="secondary" loading={busy === "save"} disabled={!dirty || !!busy} onClick={() => run("save", save, "Saved.")}>Save draft</Button>
              <Button variant="ghost" loading={busy === "ai"} disabled={!!busy} onClick={askAI}>
                <Sparkles className="size-4" aria-hidden /> AI suggestions
              </Button>
            </>
          )}
          <Button variant="danger" className="sm:ml-auto" loading={busy === "delete"} disabled={!!busy} onClick={remove}>Delete</Button>
        </div>
      </Card>

      {ai && (
        <Card className="space-y-4 p-5 sm:p-6" as="section">
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-brand-500" aria-hidden /> AI suggestions</h2>
          {([["What works", ai.strengths], ["What to improve", ai.improvements], ["Try next", ai.next_steps]] as const).map(([h, items]) =>
            items.length ? (
              <div key={h}>
                <p className="text-sm font-medium">{h}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            ) : null,
          )}
          <p className="text-xs text-muted">{ai.disclaimer}</p>
        </Card>
      )}

      {(project.colab_url || project.repo_url) && (
        <p className="flex flex-wrap gap-4 text-sm">
          {project.colab_url && <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={project.colab_url} target="_blank" rel="noopener noreferrer">Open Colab <ExternalLink className="size-3.5" aria-hidden /></a>}
          {project.repo_url && <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={project.repo_url} target="_blank" rel="noopener noreferrer">Open repository <ExternalLink className="size-3.5" aria-hidden /></a>}
        </p>
      )}
    </div>
  );
}
