"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import type { ButtonState } from "@/components/beui/button/stateful";
import { SignUpForm, type SignUpErrors, type SignUpValues } from "@/components/beui/signup-form";
import { Alert, Card } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { registerSchema, zodErrors } from "@/lib/validation";

const validate = (values: SignUpValues): SignUpErrors => {
  const parsed = registerSchema.safeParse(values);
  return parsed.success ? {} : zodErrors(parsed.error);
};

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<ButtonState>("idle");
  const [formError, setFormError] = useState("");
  const [serverErrors, setServerErrors] = useState<SignUpErrors>();
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user));
  }, [user, loading, router]);

  async function onSubmit(values: SignUpValues) {
    const { full_name, email, password } = registerSchema.parse(values);
    setFormError("");
    setStatus("loading");
    try {
      await register(full_name, email, password);
      setStatus("success");
      router.push("/verify-email");
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        const fields = err.fieldErrors();
        setServerErrors(err.code === "email_taken" ? { email: err.message } : fields);
        if (err.code !== "email_taken" && !Object.keys(fields).length) setFormError(err.message);
      } else setFormError("Registration failed. Please try again.");
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Create your student account</h1>
      <p className="mt-1 text-sm text-muted">Free. Takes less than a minute.</p>
      <div className="mt-6 space-y-3">
        <GoogleButton onError={setGoogleError} />
        {googleError && <Alert>{googleError}</Alert>}
      </div>
      <Divider />
      <SignUpForm
        validate={validate}
        onSubmit={onSubmit}
        status={status}
        errorMessage={formError}
        serverErrors={serverErrors}
        footer={<>Teacher or mentor? Accounts are set up by an IccheGhuri admin.</>}
      />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
