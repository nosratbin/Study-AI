"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { registerSchema, zodErrors } from "@/lib/validation";

const EMPTY = { full_name: "", email: "", password: "", confirm: "" };

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user));
  }, [user, loading, router]);

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(zodErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      const u = await register(parsed.data.full_name, parsed.data.email, parsed.data.password);
      router.replace(homeFor(u));
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setFormError(err.message);
      } else setFormError("Registration failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Create your student account</h1>
      <p className="mt-1 text-sm text-muted">Free. Takes less than a minute.</p>
      <div className="mt-6">
        <GoogleButton onError={setFormError} />
      </div>
      <Divider />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
          <Input id="full_name" autoComplete="name" value={form.full_name} onChange={set("full_name")} invalid={!!errors.full_name} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} invalid={!!errors.email} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} invalid={!!errors.password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <Input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} invalid={!!errors.confirm} />
        </Field>
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
        <p className="text-center text-xs text-muted">Teacher or mentor? Accounts are set up by a LEARN AI admin.</p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
