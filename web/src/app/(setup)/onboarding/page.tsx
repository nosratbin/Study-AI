"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { RequireAuth } from "@/components/layout/app-shell";
import { Alert, Button, Card, Field, Input, Logo, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LEVELS, type EducationLevel, type StudentProfile } from "@/lib/types";
import { isMinor, onboardingSchema, zodErrors } from "@/lib/validation";

const INTERESTS = ["Python", "Machine Learning", "Robotics", "Data Science", "Web Development", "Mathematics",
  "Research", "Entrepreneurship", "Design", "Competitions", "Study Abroad", "Sports", "Culture"];

const DISTRICTS_HINT = "e.g. Dhaka, Chattogram, Rajshahi, Sylhet";

type Form = {
  education_level: EducationLevel | "";
  institution: string;
  class_or_year: string;
  district: string;
  birth_year: string;
  preferred_language: "en" | "bn";
  interests: string[];
  goals: string;
  guardian_consent: boolean;
};

const STEPS = ["Level", "About you", "Interests"];

export default function OnboardingPage() {
  return (
    <RequireAuth allowIncompleteOnboarding>
      <Onboarding />
    </RequireAuth>
  );
}

function Onboarding() {
  const { user, reload } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form>({
    education_level: "", institution: "", class_or_year: "", district: "", birth_year: "",
    preferred_language: "en", interests: [], goals: "", guardian_consent: false,
  });

  useEffect(() => {
    if (user && user.role !== "student") router.replace("/dashboard");
  }, [user, router]);

  const minor = useMemo(() => {
    const y = Number(form.birth_year);
    return Number.isInteger(y) && y > 1900 && isMinor(y);
  }, [form.birth_year]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function validateStep(s: number): boolean {
    const parsed = onboardingSchema().safeParse(form);
    const all = parsed.success ? {} : zodErrors(parsed.error);
    const fieldsByStep = [["education_level"], ["birth_year", "institution", "class_or_year", "district", "guardian_consent"], ["interests", "goals"]];
    const stepErrors = Object.fromEntries(Object.entries(all).filter(([k]) => fieldsByStep[s].includes(k)));
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      if (validateStep(step)) setStep(step + 1);
      return;
    }
    const parsed = onboardingSchema().safeParse(form);
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const d = parsed.data;
      await api<StudentProfile>("/students/onboarding", {
        method: "POST",
        body: { ...d, institution: d.institution || null, class_or_year: d.class_or_year || null, district: d.district || null, goals: d.goals || null },
      });
      await reload();
      router.replace("/dashboard");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save your profile.");
      if (err instanceof ApiError) setErrors(err.fieldErrors());
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10">
      <Logo className="mb-8 h-12" />
      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={clsx("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                i < step ? "bg-success text-white" : i === step ? "bg-brand-500 text-white" : "bg-surface text-muted")}
                aria-current={i === step ? "step" : undefined}>
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={clsx("hidden text-sm sm:inline", i === step ? "font-semibold" : "text-muted")}>{s}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>

        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {formError && <Alert>{formError}</Alert>}

          {step === 0 && (
            <fieldset className="space-y-4" aria-describedby={errors.education_level ? "level-error" : undefined}>
              <legend className="text-xl font-bold tracking-tight">Hi {user?.full_name.split(" ")[0]}, what&apos;s your education level?</legend>
              <p className="text-sm text-muted">This shapes your courses, AI Tutor explanations and projects. You can change it later.</p>
              {/* Native radios: arrow keys move between options, and screen readers announce "1 of 3, selected". */}
              <div className="grid gap-3 sm:grid-cols-3">
                {LEVELS.map((l) => (
                  <label key={l.value}
                    className={clsx("relative cursor-pointer rounded-xl border-2 p-4 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40",
                      form.education_level === l.value ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200")}>
                    <input type="radio" name="education_level" value={l.value} className="sr-only"
                      checked={form.education_level === l.value} onChange={() => set("education_level", l.value)} />
                    <span className="block font-semibold">{l.label}</span>
                    <span className="block text-xs font-medium text-brand-600">{l.tag}</span>
                    <span className="mt-2 block text-xs text-muted">{l.blurb}</span>
                  </label>
                ))}
              </div>
              {errors.education_level && <p id="level-error" className="text-sm text-danger" role="alert">{errors.education_level}</p>}
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="space-y-4">
              <legend className="text-xl font-bold tracking-tight">Tell us a little about you</legend>
              <p className="text-sm text-muted">We only ask what we need. Your birth year is used to apply protections for students under 18.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Birth year" htmlFor="birth_year" error={errors.birth_year}>
                  <Input id="birth_year" inputMode="numeric" maxLength={4} placeholder="2008" value={form.birth_year}
                    invalid={!!errors.birth_year} onChange={(e) => set("birth_year", e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Preferred language" htmlFor="preferred_language">
                  <Select id="preferred_language" value={form.preferred_language} onChange={(e) => set("preferred_language", e.target.value as "en" | "bn")}>
                    <option value="en">English</option>
                    <option value="bn">বাংলা (Bangla)</option>
                  </Select>
                </Field>
                <Field label="School / college / university" htmlFor="institution" optional error={errors.institution}>
                  <Input id="institution" value={form.institution} onChange={(e) => set("institution", e.target.value)} />
                </Field>
                <Field label="Class or year" htmlFor="class_or_year" optional error={errors.class_or_year}>
                  <Input id="class_or_year" placeholder="Class 9 / HSC 1st year / 3rd year" value={form.class_or_year} onChange={(e) => set("class_or_year", e.target.value)} />
                </Field>
                <Field label="District" htmlFor="district" optional hint={DISTRICTS_HINT} error={errors.district}>
                  <Input id="district" value={form.district} onChange={(e) => set("district", e.target.value)} />
                </Field>
              </div>
              {minor && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4 accent-brand-500" checked={form.guardian_consent}
                      onChange={(e) => set("guardian_consent", e.target.checked)} aria-describedby="guardian-help" />
                    <span>
                      <span className="font-medium">My parent or guardian knows I am using IccheGhuri and agrees.</span>
                      <span id="guardian-help" className="mt-1 block text-muted">
                        Because you are under 18, your profile stays private by default and some features have extra safeguards.
                      </span>
                    </span>
                  </label>
                  {errors.guardian_consent && <p className="mt-2 text-sm text-danger" role="alert">{errors.guardian_consent}</p>}
                </div>
              )}
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="space-y-4">
              <legend className="text-xl font-bold tracking-tight">What are you interested in?</legend>
              <p className="text-sm text-muted">Pick a few. We use these to recommend courses and opportunities.</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const on = form.interests.includes(i);
                  return (
                    <button type="button" key={i} aria-pressed={on}
                      onClick={() => set("interests", on ? form.interests.filter((x) => x !== i) : [...form.interests, i])}
                      className={clsx("rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                        on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-card text-ink hover:border-brand-200")}>
                      {i}
                    </button>
                  );
                })}
              </div>
              <Field label="Your goal" htmlFor="goals" optional error={errors.goals}>
                <Textarea id="goals" placeholder="e.g. Build my first AI project and join a national olympiad" value={form.goals}
                  onChange={(e) => set("goals", e.target.value)} />
              </Field>
            </fieldset>
          )}

          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(step - 1); }}>
                <ArrowLeft className="size-4" /> Back
              </Button>
            ) : <span />}
            <Button type="submit" loading={busy}>
              {step < STEPS.length - 1 ? <>Continue <ArrowRight className="size-4" /></> : "Finish setup"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
