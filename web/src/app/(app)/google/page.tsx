"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, ExternalLink, FolderOpen, Link2Off, ShieldCheck } from "lucide-react";
import { Alert, Button, Card, Field, Input, LoadError, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { clearGoogleNext, peekGoogleNext, startGoogleConnect } from "@/components/google/google-actions";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { GoogleEvent, GoogleFeature, GoogleStatus } from "@/lib/types";

const CALLBACK_ERRORS: Record<string, string> = {
  denied: "You cancelled on Google's screen, so nothing was connected.",
  expired: "The connection request expired. Please try again.",
  state_mismatch: "That sign-in didn't come from this browser session. Please try again.",
  session: "Your IccheGhuri session changed during sign-in. Please try again.",
  exchange_failed: "Google didn't confirm the sign-in. Please try again.",
  not_configured: "Google Workspace is not set up on this server yet.",
  google_error: "Google reported a problem. Please try again.",
};

const FEATURES: { key: GoogleFeature; title: string; icon: typeof FolderOpen; access: string }[] = [
  {
    key: "drive",
    title: "Google Drive & Docs",
    icon: FolderOpen,
    access: "Save lessons and your notes as Google Docs in a \"IccheGhuri\" folder. We can only see files IccheGhuri creates, never the rest of your Drive.",
  },
  {
    key: "calendar",
    title: "Google Calendar",
    icon: CalendarDays,
    access: "Add reminders for classes, exams and deadlines to a separate \"IccheGhuri\" calendar we create. We can't see or change your other calendars or events.",
  },
];

export default function GooglePage() {
  const params = useSearchParams();
  const status = useApi<GoogleStatus>("/google/status");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connected = params.get("connected") === "1";
  const [next] = useState(() => (connected ? peekGoogleNext() : null));
  useEffect(() => {
    if (connected || params.get("error")) clearGoogleNext();
  }, [connected, params]);

  const callbackError = params.get("error");
  const missing = params.get("missing");

  async function connect(features: GoogleFeature[]) {
    setBusy(features.join(","));
    setError(null);
    try {
      await startGoogleConnect(features);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start Google sign-in.");
      setBusy(null);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google? Documents and events already created stay in your Google account.")) return;
    setBusy("disconnect");
    setError(null);
    try {
      await api("/google/disconnect", { method: "POST" });
      status.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not disconnect. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (status.error) return <LoadError message={status.error.message} onRetry={status.reload} />;
  if (!status.data) return <Spinner />;
  const s = status.data;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Google Workspace" subtitle="Keep your learning in your own Google account: notes in Docs, deadlines in Calendar." />

      {params.get("connected") && !missing && (
        <Alert tone="success">
          Google is connected.{" "}
          {next && (
            <Link href={next} className="font-semibold underline">
              Go back to where you were
            </Link>
          )}
        </Alert>
      )}
      {missing && (
        <Alert>
          Connected, but you didn&apos;t allow {missing.split(",").map((m) => (m === "drive" ? "Google Drive" : "Google Calendar")).join(" and ")}.
          Connect it again and tick the permission box to use it.
        </Alert>
      )}
      {callbackError && <Alert>{CALLBACK_ERRORS[callbackError] ?? CALLBACK_ERRORS.google_error}</Alert>}
      {error && <Alert>{error}</Alert>}

      {!s.configured ? (
        <Card>
          <p className="font-semibold">Not available yet</p>
          <p className="mt-1 text-sm text-muted">Google Workspace hasn&apos;t been set up on this IccheGhuri server. Your administrator needs to add Google OAuth credentials.</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{s.connected ? "Connected" : "Not connected"}</p>
              <p className="text-sm text-muted">{s.connected ? s.email : "Connect only the features you want. You can disconnect any time."}</p>
            </div>
            {s.connected ? (
              <Button variant="secondary" loading={busy === "disconnect"} onClick={disconnect}>
                <Link2Off className="size-4" aria-hidden /> Disconnect
              </Button>
            ) : (
              <Button loading={busy === "drive,calendar"} onClick={() => connect(["drive", "calendar"])}>
                Connect Google
              </Button>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map(({ key, title, icon: Icon, access }) => (
              <Card key={key} as="section" className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Icon className="size-5 text-brand-600" aria-hidden /> {title}
                </h2>
                <p className="text-sm text-muted">{access}</p>
                <div className="mt-auto">
                  {s.features[key] ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                      <CheckCircle2 className="size-4" aria-hidden /> Allowed
                    </p>
                  ) : (
                    <Button variant="secondary" size="sm" loading={busy === key} onClick={() => connect([key])}>
                      Allow {title}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {s.features.drive && (
            <p className="text-sm text-muted">
              To save a lesson, open it in the{" "}
              <Link href="/learn" className="text-brand-600 underline-offset-2 hover:underline">
                Learning Center
              </Link>{" "}
              and use <span className="font-medium text-ink">Save to Google Docs</span>.
            </p>
          )}
          {s.features.calendar && <ReminderForm />}
        </>
      )}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Your Google access is stored encrypted on our server and is never shown in your browser. Disconnecting revokes it at Google immediately.
      </p>
    </div>
  );
}

const KINDS = [
  { value: "class", label: "Class" },
  { value: "exam", label: "Exam" },
  { value: "study", label: "Study session" },
  { value: "other", label: "Other" },
];
const REMIND = [
  { value: 10, label: "10 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

function ReminderForm() {
  const [form, setForm] = useState({ title: "", kind: "study", date: "", time: "", duration_min: 60, remind_minutes: 30, notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<GoogleEvent | null>(null);
  // One id per reminder: a double submit or a retry after a network error updates it instead of duplicating it.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.title.trim().length < 2) errs.title = "Give the reminder a short title.";
    if (!form.date) errs.date = "Pick a date.";
    if (!form.time) errs.time = "Pick a time.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    setEvent(null);
    try {
      const ev = await api<GoogleEvent>("/google/calendar/reminder", {
        method: "POST",
        body: {
          title: form.title.trim(), kind: form.kind, starts_at: `${form.date}T${form.time}:00+06:00`, // Bangladesh time
          duration_min: Number(form.duration_min), remind_minutes: Number(form.remind_minutes), notes: form.notes.trim() || null,
          request_id: requestId,
        },
      });
      setEvent(ev);
      setRequestId(crypto.randomUUID()); // the next reminder is a new event
      setForm((f) => ({ ...f, title: "", notes: "" }));
    } catch (err) {
      if (err instanceof ApiError) {
        const fe = err.fieldErrors();
        if (fe.starts_at) setErrors({ date: fe.starts_at });
        setError(err.message);
      } else setError("Could not create the reminder.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section">
      <h2 className="font-semibold">Add a reminder</h2>
      <p className="mt-1 text-sm text-muted">For scholarship and competition deadlines, use the button on the opportunity page instead.</p>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title" htmlFor="r-title" error={errors.title}>
            <Input id="r-title" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} invalid={!!errors.title}
              placeholder="e.g. Physics model test" />
          </Field>
        </div>
        <Field label="Type" htmlFor="r-kind">
          <Select id="r-kind" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Remind me" htmlFor="r-remind">
          <Select id="r-remind" value={form.remind_minutes} onChange={(e) => set("remind_minutes", Number(e.target.value))}>
            {REMIND.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="r-date" error={errors.date}>
          <Input id="r-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} invalid={!!errors.date} />
        </Field>
        <Field label="Start time (Bangladesh time)" htmlFor="r-time" error={errors.time}>
          <Input id="r-time" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} invalid={!!errors.time} />
        </Field>
        <Field label="Duration" htmlFor="r-duration">
          <Select id="r-duration" value={form.duration_min} onChange={(e) => set("duration_min", Number(e.target.value))}>
            {[30, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? "" : "s"}`}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="r-notes" optional>
            <Textarea id="r-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} rows={2} />
          </Field>
        </div>
        <div className="space-y-3 sm:col-span-2">
          <Button type="submit" loading={busy}>
            <CalendarDays className="size-4" aria-hidden /> Add to Google Calendar
          </Button>
          {error && <Alert>{error}</Alert>}
          {event && (
            <Alert tone="success">
              Reminder added.{" "}
              {event.html_link && (
                <a href={event.html_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
                  Open in Calendar <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </Alert>
          )}
        </div>
      </form>
    </Card>
  );
}
