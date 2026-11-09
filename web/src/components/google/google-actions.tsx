"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, ExternalLink, FileText } from "lucide-react";
import { Alert, Button, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { GoogleDoc, GoogleEvent, GoogleFeature, GoogleStatus } from "@/lib/types";

const NEXT_KEY = "learnai:google-next";
const GOOGLE_AUTH = "https://accounts.google.com/";

/** Start Google's consent screen. `next` is where /google offers to send the student back afterwards. */
export async function startGoogleConnect(features: GoogleFeature[], next?: string) {
  const { auth_url } = await api<{ auth_url: string }>("/google/connect", { method: "POST", body: { features } });
  if (!auth_url.startsWith(GOOGLE_AUTH)) throw new ApiError(0, "bad_redirect", "Unexpected sign-in address.");
  try {
    if (next && next.startsWith("/") && !next.startsWith("//")) sessionStorage.setItem(NEXT_KEY, next);
  } catch {
    /* storage unavailable: the student just lands on /google */
  }
  window.location.assign(auth_url);
}

/** Read without side effects (safe in render); call clearGoogleNext() from an effect. */
export function peekGoogleNext(): string | null {
  try {
    const v = sessionStorage.getItem(NEXT_KEY);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
  } catch {
    return null;
  }
}

export function clearGoogleNext() {
  try {
    sessionStorage.removeItem(NEXT_KEY);
  } catch {
    /* ignore */
  }
}

function errorMessage(e: unknown) {
  return e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
}

/** Shown instead of an action when Google isn't set up yet for this student. */
function NeedsGoogle({ status, feature, next }: { status: GoogleStatus; feature: GoogleFeature; next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = feature === "drive" ? "Google Drive" : "Google Calendar";
  if (!status.configured) return <p className="text-sm text-muted">{name} integration isn&apos;t available yet.</p>;

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      await startGoogleConnect([feature], next);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {status.connected ? `Allow LEARN AI to use ${name} first.` : `Connect your Google account to use ${name}.`}{" "}
        <Link href="/google" className="text-brand-600 underline-offset-2 hover:underline">
          What we can access
        </Link>
      </p>
      <Button variant="secondary" size="sm" loading={busy} onClick={connect}>
        Connect {name}
      </Button>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

function Done({ href, label }: { href: string | null; label: string }) {
  return (
    <Alert tone="success">
      {label}
      {href && (
        <>
          {" "}
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
            Open <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </>
      )}
    </Alert>
  );
}

export function SaveLessonToDocs({ lessonId }: { lessonId: string }) {
  const status = useApi<GoogleStatus>("/google/status");
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<GoogleDoc | null>(null);

  if (!status.data || !status.data.configured) return null; // hide entirely until the server is configured

  async function save() {
    setBusy(true);
    setError(null);
    try {
      setDoc(await api<GoogleDoc>("/google/drive/lesson", { method: "POST", body: { lesson_id: lessonId, notes: notes.trim() || null } }));
      setOpen(false);
      setNotes("");
    } catch (e) {
      if (e instanceof ApiError && ["google_reconnect_required", "google_scope_missing", "google_not_connected"].includes(e.code)) status.reload();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const ready = status.data.connected && status.data.features.drive;
  return (
    <section className="space-y-3 rounded-card border border-line bg-white p-4" aria-labelledby="docs-heading">
      <h2 id="docs-heading" className="flex items-center gap-2 text-sm font-semibold">
        <FileText className="size-4 text-brand-600" aria-hidden /> Save to Google Docs
      </h2>
      {doc && <Done href={doc.web_view_link} label="Saved to the LEARN AI folder in your Google Drive." />}
      {!ready ? (
        <NeedsGoogle status={status.data} feature="drive" next={`/lessons/${lessonId}`} />
      ) : open ? (
        <div className="space-y-2">
          <label htmlFor="doc-notes" className="text-sm text-muted">
            Your notes (optional, added at the end of the document)
          </label>
          <Textarea id="doc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} rows={4} />
          <div className="flex gap-2">
            <Button size="sm" loading={busy} onClick={save}>
              Save document
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {doc ? "Save another copy" : "Save this lesson"}
        </Button>
      )}
      {error && <Alert>{error}</Alert>}
    </section>
  );
}

export function AddDeadlineToCalendar({ opportunityId }: { opportunityId: string }) {
  const status = useApi<GoogleStatus>("/google/status");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<GoogleEvent | null>(null);

  if (!status.data) return null;

  async function add() {
    setBusy(true);
    setError(null);
    try {
      setEvent(await api<GoogleEvent>("/google/calendar/opportunity", { method: "POST", body: { opportunity_id: opportunityId } }));
    } catch (e) {
      if (e instanceof ApiError && ["google_reconnect_required", "google_scope_missing", "google_not_connected"].includes(e.code)) status.reload();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const ready = status.data.connected && status.data.features.calendar;
  return (
    <div className="space-y-2">
      {event ? (
        <Done href={event.html_link} label="Added to your Google Calendar with reminders 7 days and 1 day before." />
      ) : ready ? (
        <Button variant="secondary" loading={busy} onClick={add} className="w-full">
          <CalendarPlus className="size-4" aria-hidden /> Add deadline to Google Calendar
        </Button>
      ) : (
        <NeedsGoogle status={status.data} feature="calendar" next={`/opportunities-hub/${opportunityId}`} />
      )}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
