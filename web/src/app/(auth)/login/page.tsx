"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Divider, GoogleButton } from "@/components/auth/google-button";
import { GuestAccess } from "@/components/auth/guest-access";
import type { ButtonState } from "@/components/beui/button/stateful";
import { SignInForm, type SignInErrors, type SignInValues } from "@/components/beui/signin-form";
import { Alert, Card } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { loginSchema, zodErrors } from "@/lib/validation";
import { rememberPending } from "@/lib/verification";

const validate = (values: SignInValues): SignInErrors => {
  const parsed = loginSchema.safeParse(values);
  return parsed.success ? {} : zodErrors(parsed.error);
};

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<ButtonState>("idle");
  const [formError, setFormError] = useState("");
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    if (!loading && user && status !== "success") router.replace(homeFor(user));
  }, [user, loading, router, status]);

  async function onSubmit(values: SignInValues) {
    setFormError("");
    setStatus("loading");
    try {
      const u = await login(values.email.trim(), values.password);
      setStatus("success");
      router.replace(homeFor(u));
    } catch (err) {
      if (err instanceof ApiError && err.code === "email_unverified") {
        // Right password, unverified email: the API has sent a fresh code. Carry the address over without the URL.
        const d = err.details?.[0];
        rememberPending(typeof d?.email === "string" ? d.email : values.email.trim().toLowerCase(), Number(d?.resend_after) || 60);
        router.push("/verify-email");
        return;
      }
      setStatus("error");
      setFormError(err instanceof ApiError ? err.message : "Sign-in failed. Please try again.");
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to continue learning.</p>
      <div className="mt-6 space-y-3">
        <GoogleButton onError={setGoogleError} />
        {googleError && <Alert>{googleError}</Alert>}
      </div>
      <Divider />
      <SignInForm validate={validate} onSubmit={onSubmit} status={status} errorMessage={formError} />
      <p className="mt-6 text-center text-sm text-muted">
        New to IccheGhuri?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
      <GuestAccess />
    </Card>
  );
}
