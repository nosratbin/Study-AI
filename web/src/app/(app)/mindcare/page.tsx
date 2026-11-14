"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ExternalLink, HeartHandshake, Lock, Phone, Trash2, Wind } from "lucide-react";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadError, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { MOOD_TAGS, SUPPORT_TOPICS, formatDeadline, type Checkin, type SupportDirectory, type SupportRequest, type SupportTopic } from "@/lib/types";

const MOODS = [
  { value: 1, face: "😞", label: "Very low" },
  { value: 2, face: "🙁", label: "Low" },
  { value: 3, face: "😐", label: "Okay" },
  { value: 4, face: "🙂", label: "Good" },
  { value: 5, face: "😄", label: "Great" },
];

export default function MindCarePage() {
  const { user } = useAuth();
  if (user && user.role !== "student")
    return (
      <EmptyState icon={<Lock className="size-7" />} title="Private to students">
        MindCare check-ins are only visible to the student who wrote them. Support requests are handled from the admin support inbox.
      </EmptyState>
    );
  return <MindCare />;
}

function MindCare() {
  const history = useApi<Checkin[]>("/mindcare/checkins?days=30");
  const directory = useApi<SupportDirectory>("/mindcare/resources");
  const [showSupport, setShowSupport] = useState(false);

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        title="MindCare"
        subtitle="A private space to notice how you're feeling, take a breather, and find people who can help."
      />

      <Alert tone="success">
        <span className="inline-flex items-center gap-1.5 font-medium"><Lock className="size-4" aria-hidden /> Private.</span>{" "}
        Only you can see your check-ins and notes. Notes are encrypted, teachers can&apos;t see them, and nothing here affects your
        courses or scores. MindCare is not a medical service and doesn&apos;t give a diagnosis.
      </Alert>

      <EmergencyBanner directory={directory.data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CheckinCard
          onSaved={(c) => {
            history.setData([c, ...(history.data ?? [])]);
            if (c.show_support) setShowSupport(true);
          }}
        />
        <Breathing />
      </div>

      {showSupport && (
        <Card className="space-y-2 border-brand-200 bg-brand-50/50 p-5">
          <p className="font-semibold">Thanks for being honest about how you feel.</p>
          <p className="text-sm">
            Hard days happen to everyone. Talking to someone you trust (a friend, family member or teacher) often helps. You can also
            reach the support options below or ask our team to contact you.
          </p>
        </Card>
      )}

      <section className="space-y-3" aria-labelledby="history">
        <div className="flex items-center justify-between gap-2">
          <h2 id="history" className="text-lg font-semibold">Last 30 days</h2>
          {!!history.data?.length && <EraseAll onDone={() => history.setData([])} />}
        </div>
        {history.error ? (
          <LoadError message={history.error.message} onRetry={history.reload} />
        ) : !history.data ? (
          <Spinner />
        ) : !history.data.length ? (
          <p className="text-sm text-muted">No check-ins yet.</p>
        ) : (
          <>
            <MoodStrip items={history.data} />
            <ul className="space-y-2">
              {history.data.map((c) => (
                <CheckinRow key={c.id} c={c} onDeleted={() => history.setData(history.data!.filter((x) => x.id !== c.id))} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="support">
        <h2 id="support" className="text-lg font-semibold">Support</h2>
        {directory.error ? (
          <LoadError message={directory.error.message} onRetry={directory.reload} />
        ) : !directory.data ? (
          <Spinner />
        ) : directory.data.resources.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {directory.data.resources.map((r) => (
              <li key={r.id}>
                <Card className="h-full space-y-1.5 p-5">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="brand" className="capitalize">{r.kind}</Badge>
                    <Badge tone="success">Checked by IccheGhuri</Badge>
                  </div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-muted">{r.description}</p>
                  <p className="text-xs text-muted">
                    {[r.hours, r.languages.map((l) => (l === "bn" ? "বাংলা" : "English")).join(" / "), r.cost_note].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex flex-wrap gap-4 pt-1 text-sm">
                    {r.phone && <a href={`tel:${r.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"><Phone className="size-3.5" aria-hidden /> {r.phone}</a>}
                    {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">Website <ExternalLink className="size-3.5" aria-hidden /></a>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Our team is still checking counsellors and helplines before listing them here. Meanwhile, you can ask us to contact you below.
          </p>
        )}
        <SupportRequestCard />
      </section>
    </div>
  );
}

function EmergencyBanner({ directory }: { directory: SupportDirectory | null }) {
  const e = directory?.emergency ?? { number: "999", label: "National Emergency Service (Bangladesh)" };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        <strong>If you or someone else is in danger right now</strong>, call {e.label}.
      </p>
      <a href={`tel:${e.number}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-danger px-4 font-semibold text-white">
        <Phone className="size-4" aria-hidden /> Call {e.number}
      </a>
    </div>
  );
}

function CheckinCard({ onSaved }: { onSaved: (c: Checkin) => void }) {
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function save() {
    if (!mood) return;
    setBusy(true);
    setMsg(null);
    try {
      const c = await api<Checkin>("/mindcare/checkin", { method: "POST", body: { mood, tags, note: note.trim() || null } });
      onSaved(c);
      setMood(null);
      setTags([]);
      setNote("");
      setMsg({ tone: "success", text: "Saved. Thanks for checking in." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-semibold">How are you feeling today?</h2>
      <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={mood === m.value}
            onClick={() => setMood(m.value)}
            className={clsx(
              "flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs transition-colors",
              mood === m.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line hover:bg-surface",
            )}
          >
            <span className="text-2xl" aria-hidden>{m.face}</span>
            {m.label}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">What&apos;s on your mind? <span className="font-normal text-muted">(optional)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                aria-pressed={on}
                onClick={() => setTags(on ? tags.filter((x) => x !== t) : tags.length < 6 ? [...tags, t] : tags)}
                className={clsx("rounded-full border px-3 py-1 text-xs capitalize", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted hover:text-ink")}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Journal note" htmlFor="note" optional hint="Encrypted. Only you can read it.">
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} />
      </Field>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Button onClick={save} disabled={!mood} loading={busy}>Save check-in</Button>
    </Card>
  );
}

const PHASES = [
  { label: "Breathe in", secs: 4, scale: 1 },
  { label: "Hold", secs: 4, scale: 1 },
  { label: "Breathe out", secs: 4, scale: 0.6 },
  { label: "Hold", secs: 4, scale: 0.6 },
];

function Breathing() {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0); // seconds since start

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const cycle = PHASES.reduce((s, p) => s + p.secs, 0);
  let t = tick % cycle;
  let phase = PHASES[0];
  for (const p of PHASES) {
    if (t < p.secs) { phase = p; break; }
    t -= p.secs;
  }
  const rounds = Math.floor(tick / cycle);

  return (
    <Card className="flex flex-col items-center gap-4 p-5 text-center">
      <h2 className="flex items-center gap-2 self-start font-semibold"><Wind className="size-4 text-brand-500" aria-hidden /> Box breathing</h2>
      <p className="self-start text-left text-sm text-muted">Four seconds in, hold, out, hold. A few rounds can help you feel calmer before an exam or when things feel like a lot.</p>
      <div className="relative grid size-40 place-items-center">
        <div
          className="absolute inset-0 rounded-full bg-brand-100 transition-transform duration-[4000ms] ease-in-out motion-reduce:transition-none"
          style={{ transform: `scale(${running ? phase.scale : 0.8})` }}
          aria-hidden
        />
        {/* Announce only the phase change, not every second of the countdown. */}
        <p className="relative text-lg font-semibold">
          <span aria-live="polite">{running ? phase.label : "Ready"}</span>
          {running && <span aria-hidden> · {phase.secs - t}</span>}
        </p>
      </div>
      <p className="text-xs text-muted">{running ? `Round ${rounds + 1}` : ""}</p>
      <Button variant={running ? "secondary" : "primary"} onClick={() => { setRunning(!running); setTick(0); }}>
        {running ? "Stop" : "Start"}
      </Button>
    </Card>
  );
}

function MoodStrip({ items }: { items: Checkin[] }) {
  const avg = items.reduce((s, c) => s + c.mood, 0) / items.length;
  const recent = [...items].reverse().slice(-14);
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{items.length} check-in{items.length === 1 ? "" : "s"} · average mood {avg.toFixed(1)} / 5</p>
      <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden>
        {recent.map((c) => (
          <div key={c.id} className="flex-1 rounded-t bg-brand-200" style={{ height: `${(c.mood / 5) * 100}%` }} title={`${formatDeadline(c.created_at)}: ${c.mood}/5`} />
        ))}
      </div>
    </Card>
  );
}

function CheckinRow({ c, onDeleted }: { c: Checkin; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const m = MOODS.find((x) => x.value === c.mood);
  async function del() {
    if (!window.confirm("Delete this check-in?")) return;
    setBusy(true);
    try {
      await api(`/mindcare/checkins/${c.id}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Could not delete the check-in. Please try again.");
      setBusy(false);
    }
  }
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <span className="text-2xl" role="img" aria-label={m?.label}>{m?.face}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">{formatDeadline(c.created_at)}{c.tags.length ? ` · ${c.tags.join(", ")}` : ""}</p>
        {c.note && <p className="mt-1 whitespace-pre-wrap text-sm">{c.note}</p>}
      </div>
      <button onClick={del} disabled={busy} aria-label="Delete check-in" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger">
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}

function EraseAll({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function erase() {
    if (!window.confirm("Permanently delete all your check-ins and journal notes? This can't be undone.")) return;
    setBusy(true);
    try {
      await api("/mindcare/checkins", { method: "DELETE" });
      onDone();
    } catch (e) {
      window.alert(`Your journal was NOT erased. ${e instanceof ApiError ? e.message : "Please try again."}`);
    } finally {
      setBusy(false);
    }
  }
  return <Button size="sm" variant="danger" loading={busy} onClick={erase}>Erase journal</Button>;
}

function SupportRequestCard() {
  const mine = useApi<SupportRequest[]>("/mindcare/support-requests");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ topic: "stress" as SupportTopic, message: "", preferred_contact: "email" as "email" | "phone", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErrors({});
    try {
      await api("/mindcare/support-requests", {
        method: "POST",
        body: { ...form, phone: form.preferred_contact === "phone" ? form.phone.trim() : null },
      });
      setOpen(false);
      setForm({ topic: "stress", message: "", preferred_contact: "email", phone: "" });
      setMsg({ tone: "success", text: "Sent. A member of the IccheGhuri support team will contact you. In an emergency, call 999." });
      mine.reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setMsg({ tone: "error", text: err.message });
      } else setMsg({ tone: "error", text: "Could not send. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold"><HeartHandshake className="size-4 text-brand-500" aria-hidden /> Talk to a person</p>
          <p className="text-sm text-muted">Ask the IccheGhuri support team to reach out. Your message is encrypted and only seen by support staff, never by teachers.</p>
        </div>
        {!open && <Button size="sm" onClick={() => setOpen(true)}>Request support</Button>}
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {open && (
        <form onSubmit={send} className="space-y-4">
          <Field label="Topic" htmlFor="topic">
            <Select id="topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value as SupportTopic })}>
              {SUPPORT_TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="What would you like help with?" htmlFor="message" error={errors.message}>
            <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} minLength={10} maxLength={3000} required invalid={!!errors.message} />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How should we contact you?</legend>
            <div className="flex gap-4 text-sm">
              {(["email", "phone"] as const).map((c) => (
                <label key={c} className="flex items-center gap-2 capitalize">
                  <input type="radio" name="contact" className="accent-brand-500" checked={form.preferred_contact === c} onChange={() => setForm({ ...form, preferred_contact: c })} />
                  {c === "email" ? "Email (your account email)" : "Phone"}
                </label>
              ))}
            </div>
          </fieldset>
          {form.preferred_contact === "phone" && (
            <Field label="Phone number" htmlFor="phone" error={errors.phone}>
              <Input id="phone" type="tel" inputMode="tel" placeholder="+880 1XXX XXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required invalid={!!errors.phone} />
            </Field>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>Send request</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
      {!!mine.data?.length && (
        <ul className="space-y-1.5 border-t border-line pt-3 text-sm">
          {mine.data.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2">
              <span>{SUPPORT_TOPICS.find((t) => t.value === r.topic)?.label} · {formatDeadline(r.created_at)}</span>
              <Badge tone={r.status === "closed" ? "neutral" : r.status === "in_progress" ? "success" : "brand"}>
                {r.status === "open" ? "Waiting" : r.status === "in_progress" ? "Being handled" : "Closed"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
