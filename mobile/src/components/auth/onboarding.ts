/**
 * Pure model of the onboarding stepper (src/app/(setup)/index.tsx): which steps show, which can be skipped, which form
 * fields each step owns, and the payload sent to POST /students/onboarding.
 */
import type { EducationLevel, Language } from "@/lib/types";
import { isMinor, MIN_AGE, onboardingSchema, zodErrors } from "@/lib/validation";

export type StepKey = "level" | "institution" | "district" | "birth_year" | "consent" | "language" | "interests" | "goals";

export interface OnboardingForm {
  education_level: EducationLevel | "";
  institution: string;
  class_or_year: string;
  district: string;
  birth_year: number | null;
  preferred_language: Language;
  interests: string[];
  goals: string;
  guardian_consent: boolean;
}

export const INITIAL_FORM: OnboardingForm = {
  education_level: "",
  institution: "",
  class_or_year: "",
  district: "",
  birth_year: null,
  preferred_language: "en",
  interests: [],
  goals: "",
  guardian_consent: false,
};

/** Same list as the web onboarding. The backend stores them lowercased. */
export const INTERESTS = [
  "Python", "Machine Learning", "Robotics", "Data Science", "Web Development", "Mathematics",
  "Research", "Entrepreneurship", "Design", "Competitions", "Study Abroad", "Sports", "Culture",
];

export const CLASS_OPTIONS: Record<EducationLevel, string[]> = {
  school: ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"],
  college: ["HSC 1st year", "HSC 2nd year"],
  university: ["1st year", "2nd year", "3rd year", "4th year", "Masters"],
};

/** Form fields owned by each step, so a validation or server error can send the student back to the right screen. */
export const STEP_FIELDS: Record<StepKey, (keyof OnboardingForm)[]> = {
  level: ["education_level"],
  institution: ["institution", "class_or_year"],
  district: ["district"],
  birth_year: ["birth_year"],
  consent: ["guardian_consent"],
  language: ["preferred_language"],
  interests: ["interests"],
  goals: ["goals"],
};

/** Steps that offer "Skip". */
export const OPTIONAL_STEPS: ReadonlySet<StepKey> = new Set(["institution", "district", "interests", "goals"]);

export function minorFor(form: OnboardingForm, currentYear?: number): boolean {
  return form.birth_year !== null && isMinor(form.birth_year, currentYear);
}

/** The guardian-consent step only exists for minors. */
export function stepsFor(form: OnboardingForm, currentYear?: number): StepKey[] {
  const steps: StepKey[] = ["level", "institution", "district", "birth_year"];
  if (minorFor(form, currentYear)) steps.push("consent");
  steps.push("language", "interests", "goals");
  return steps;
}

/** Field errors for the whole form, from the shared schema (birth_year is coerced, so null reads as missing). */
export function validate(form: OnboardingForm, currentYear?: number): Record<string, string> {
  const parsed = onboardingSchema(currentYear).safeParse({ ...form, birth_year: form.birth_year ?? undefined });
  if (parsed.success) return {};
  const errors = zodErrors(parsed.error);
  if (form.birth_year === null) errors.birth_year = "Choose your birth year";
  return errors;
}

export function errorsForStep(errors: Record<string, string>, step: StepKey): Record<string, string> {
  const owned = STEP_FIELDS[step] as string[];
  return Object.fromEntries(Object.entries(errors).filter(([k]) => owned.includes(k)));
}

/** The first visible step that owns one of these error fields, or -1. */
export function firstStepWithError(errors: Record<string, string>, steps: StepKey[]): number {
  return steps.findIndex((s) => Object.keys(errorsForStep(errors, s)).length > 0);
}

/** Body for POST /students/onboarding: optional text goes as null when blank. */
export function toPayload(form: OnboardingForm) {
  const blank = (v: string) => v.trim() || null;
  return {
    education_level: form.education_level,
    institution: blank(form.institution),
    class_or_year: blank(form.class_or_year),
    district: blank(form.district),
    birth_year: form.birth_year,
    preferred_language: form.preferred_language,
    interests: form.interests,
    goals: blank(form.goals),
    guardian_consent: form.guardian_consent,
  };
}

/** A sensible year to centre the birth-year wheel on before the student picks one. */
export function suggestedBirthYear(level: EducationLevel | "", currentYear = new Date().getUTCFullYear()): number {
  const age = level === "school" ? 14 : level === "college" ? 17 : level === "university" ? 21 : 16;
  return currentYear - age;
}

export const MIN_BIRTH_YEAR = 1950;

/** Newest first, from the youngest allowed age (MIN_AGE) down to 1950, the backend's lower bound. */
export function birthYears(currentYear = new Date().getUTCFullYear(), minAge = MIN_AGE): number[] {
  const out: number[] = [];
  for (let y = currentYear - minAge; y >= MIN_BIRTH_YEAR; y--) out.push(y);
  return out;
}

export interface District {
  name: string;
  bn: string;
}

/** Filter the 64 districts by English or Bangla name: start-of-name matches first, then anywhere. Mirrors the web. */
export function filterDistricts(all: District[], query: string): District[] {
  const q = query.trim();
  const needle = q.toLowerCase();
  if (!needle) return all;
  return all
    .map((d) => {
      const name = d.name.toLowerCase();
      const rank = name.startsWith(needle) ? 0 : d.bn.startsWith(q) ? 1 : name.includes(needle) || d.bn.includes(q) ? 2 : -1;
      return { d, rank };
    })
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.d.name.localeCompare(b.d.name))
    .map(({ d }) => d);
}
