/** Client-side validation mirroring the backend rules (the backend remains authoritative). */
import { z } from "zod";

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((v) => new TextEncoder().encode(v).length <= 72, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .transform((v) => v.trim().replace(/\s+/g, " "))
      .pipe(z.string().min(2, "Enter your full name").max(120)),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
});

export const MIN_AGE = 8;

export function onboardingSchema(currentYear = new Date().getUTCFullYear()) {
  return z
    .object({
      education_level: z.enum(["school", "college", "university"], { error: "Choose your level" }),
      institution: z.string().trim().max(200).optional(),
      class_or_year: z.string().trim().max(50).optional(),
      district: z.string().trim().max(80).optional(),
      birth_year: z.coerce
        .number({ error: "Enter your birth year" })
        .int()
        .min(1950, "Enter a valid year")
        .max(currentYear - MIN_AGE, `LEARN AI is for students aged ${MIN_AGE}+`),
      preferred_language: z.enum(["en", "bn"]),
      interests: z.array(z.string()).max(15),
      goals: z.string().trim().max(1000).optional(),
      guardian_consent: z.boolean(),
    })
    .refine((v) => !isMinor(v.birth_year, currentYear) || v.guardian_consent, {
      path: ["guardian_consent"],
      message: "A parent or guardian must agree before you continue",
    });
}

/** Same conservative rule as the backend: anyone who may still be 17 is treated as a minor. */
export function isMinor(birthYear: number, currentYear = new Date().getUTCFullYear()): boolean {
  return currentYear - birthYear <= 18;
}

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  subject: z.string().trim().min(2, "Add a subject").max(200),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(5000),
});

export function zodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
