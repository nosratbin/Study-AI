"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Card, Field, Input, Select, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LEVELS, type EducationLevel, type Language, type StudentProfile } from "@/lib/types";

export default function SettingsPage() {
  const { user, reload } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState({ full_name: user?.full_name ?? "", education_level: "" as EducationLevel | "", preferred_language: "en" as Language, institution: "", class_or_year: "", district: "" });
  // The page can render before auth resolves, so fill the name once the user arrives.
  const [nameFor, setNameFor] = useState(user?.id);
  if (user && nameFor !== user.id) {
    setNameFor(user.id);
    setForm((f) => ({ ...f, full_name: user.full_name }));
  }
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const isStudent = user?.role === "student";

  useEffect(() => {
    if (!isStudent) return;
    api<StudentProfile>("/students/profile")
      .then((p) => {
        setProfile(p);
        setForm((f) => ({
          ...f, education_level: p.education_level ?? "", preferred_language: p.preferred_language,
          institution: p.institution ?? "", class_or_year: p.class_or_year ?? "", district: p.district ?? "",
        }));
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Could not load your profile."));
  }, [isStudent]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (form.full_name.trim().length < 2) return setMsg({ tone: "error", text: "Enter your full name." });
    setBusy(true);
    try {
      await api("/students/profile", {
        method: "PATCH",
        body: {
          full_name: form.full_name, education_level: form.education_level || undefined, preferred_language: form.preferred_language,
          institution: form.institution || null, class_or_year: form.class_or_year || null, district: form.district || null,
        },
      });
      await reload();
      setMsg({ tone: "success", text: "Saved." });
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  async function onLogoutAll() {
    try {
      await api("/auth/logout-all", { method: "POST" });
      await reload();
      router.replace("/login");
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Could not sign out everywhere. Try again." });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile &amp; settings</h1>
      {isStudent && (
        <Card className="p-6">
          {loadError ? <Alert>{loadError}</Alert> : !profile ? <Spinner /> : (
            <form onSubmit={onSave} className="space-y-4" noValidate>
              {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
              <Field label="Full name" htmlFor="full_name">
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Education level" htmlFor="education_level" hint="Changes your courses and AI Tutor style.">
                  <Select id="education_level" value={form.education_level} onChange={(e) => setForm({ ...form, education_level: e.target.value as EducationLevel })}>
                    {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label} ({l.tag})</option>)}
                  </Select>
                </Field>
                <Field label="Preferred language" htmlFor="preferred_language">
                  <Select id="preferred_language" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value as Language })}>
                    <option value="en">English</option>
                    <option value="bn">বাংলা (Bangla)</option>
                  </Select>
                </Field>
                <Field label="Institution" htmlFor="institution" optional>
                  <Input id="institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
                </Field>
                <Field label="Class or year" htmlFor="class_or_year" optional>
                  <Input id="class_or_year" value={form.class_or_year} onChange={(e) => setForm({ ...form, class_or_year: e.target.value })} />
                </Field>
                <Field label="District" htmlFor="district" optional>
                  <Input id="district" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </Field>
              </div>
              {profile.is_minor && (
                <p className="text-sm text-muted">Under-18 safeguards are active on your account (guardian acknowledgement recorded).</p>
              )}
              <Button type="submit" loading={busy}>Save changes</Button>
            </form>
          )}
        </Card>
      )}
      <Card className="p-6">
        <h2 className="font-semibold">Security</h2>
        <p className="mt-1 text-sm text-muted">Signed in as {user?.email}. Sign out of every device if you think someone else has access.</p>
        <Button variant="danger" className="mt-4" onClick={onLogoutAll}>Sign out everywhere</Button>
      </Card>
    </div>
  );
}
