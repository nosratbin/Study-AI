"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { LEVELS, type AnnouncementAudience, type EducationLevel } from "@/lib/types";

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: "students", label: "Students" },
  { value: "teachers", label: "Teachers and admins" },
  { value: "all", label: "Everyone" },
];

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("students");
  const [level, setLevel] = useState<EducationLevel | "">("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<number | null>(null);

  const who =
    audience === "students"
      ? `${level ? LEVELS.find((l) => l.value === level)?.label.toLowerCase() + " " : "all "}students`
      : audience === "teachers"
        ? "all teachers and admins"
        : "everyone";

  async function send() {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const r = await api<{ sent: number }>("/admin/announcements", {
        method: "POST",
        body: {
          title,
          body,
          link: link.trim() || null,
          audience,
          level: audience === "students" && level ? level : null,
        },
      });
      setSent(r.sent);
      setTitle("");
      setBody("");
      setLink("");
    } catch (e) {
      if (e instanceof ApiError) {
        setFields(e.fieldErrors());
        setError(e.message);
      } else setError("Could not send the announcement.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Announcements" subtitle="Send an in-app notification. It shows in each person's notification bell." />

      <Card as="section" className="max-w-2xl">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(null);
            setConfirming(true);
          }}
        >
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="a-title" error={fields.title}>
              <Input
                id="a-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setConfirming(false);
                }}
                required
                minLength={2}
                maxLength={200}
                invalid={!!fields.title}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Message" htmlFor="a-body" optional error={fields.body}>
              <Textarea
                id="a-body"
                rows={4}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setConfirming(false);
                }}
                maxLength={2000}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Link inside IccheGhuri" htmlFor="a-link" optional hint="A page path such as /opportunities-hub or /learn" error={fields.link}>
              <Input
                id="a-link"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setConfirming(false);
                }}
                placeholder="/learn"
                maxLength={300}
                invalid={!!fields.link}
              />
            </Field>
          </div>
          <Field label="Send to" htmlFor="a-aud">
            <Select
              id="a-aud"
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as AnnouncementAudience);
                setConfirming(false);
              }}
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          {audience === "students" && (
            <Field label="Level" htmlFor="a-level">
              <Select
                id="a-level"
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value as EducationLevel | "");
                  setConfirming(false);
                }}
              >
                <option value="">All levels</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {error && (
            <div className="sm:col-span-2">
              <Alert>{error}</Alert>
            </div>
          )}
          {sent !== null && (
            <div className="sm:col-span-2">
              <Alert tone="success">
                Sent to {sent} {sent === 1 ? "person" : "people"}.
              </Alert>
            </div>
          )}
          <div className="sm:col-span-2">
            {confirming ? (
              <div
                className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                role="alert"
              >
                <p className="text-sm">
                  Send &ldquo;{title.trim().slice(0, 60)}&rdquo; to <strong>{who}</strong>? This can&apos;t be undone.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" onClick={send} loading={busy}>
                    Send now
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="submit">
                <Megaphone className="size-4" /> Review and send
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
