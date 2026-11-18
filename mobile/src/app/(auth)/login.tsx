/**
 * Sign in with email and password. An unverified account (403 email_unverified) gets a fresh code from the backend and
 * useAuth().login sets `pending`, so we continue to verify-email. On success the root guard moves the user on.
 */
import { useRef, useState } from "react";
import type { TextInputInstance } from "react-native";
import { router } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { loginSchema, zodErrors } from "@/lib/validation";
import { Button, FormError, Input as Field } from "@/components/ui";
import { KeyboardForm, ScreenTitle, TextLink } from "@/components/auth/auth-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { splitApiError } from "@/components/auth/errors";
import { View } from "@/tw";

const FIELDS = ["email", "password"] as const;
type Values = Record<(typeof FIELDS)[number], string>;

export default function Login() {
  const { login } = useAuth();
  const headerHeight = useHeaderHeight();
  const passwordRef = useRef<TextInputInstance>(null);
  const [values, setValues] = useState<Values>({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  function check(v: Values) {
    const parsed = loginSchema.safeParse(v);
    return parsed.success ? {} : zodErrors(parsed.error);
  }

  function set(key: keyof Values, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    // After the first attempt, errors update as the student fixes them.
    if (submitted) setErrors(check(next));
  }

  async function submit() {
    if (busy) return;
    setSubmitted(true);
    setFormError(null);
    const fieldErrors = check(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      if (fieldErrors.password && !fieldErrors.email) passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await login(values.email.trim(), values.password);
      // Signed in: the root Stack.Protected guard swaps (auth) for (setup) or (app).
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === "email_unverified") {
        router.push("/verify-email");
        return;
      }
      const split = splitApiError(e, FIELDS, "Sign-in failed. Please try again.");
      setErrors(split.fields);
      setFormError(split.message);
    }
  }

  return (
    <KeyboardForm
      keyboardOffset={headerHeight}
      footer={
        <Button onPress={submit} loading={busy}>
          Sign in
        </Button>
      }
    >
      <ScreenTitle title="Welcome back" subtitle="Sign in to continue learning." />
      <GoogleButton disabled={busy} />
      <View className="gap-4">
        <FormError message={formError} />
        <Field
          label="Email"
          value={values.email}
          onChangeText={(t) => set("email", t)}
          error={errors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!busy}
        />
        <Field
          ref={passwordRef}
          label="Password"
          secure
          value={values.password}
          onChangeText={(t) => set("password", t)}
          error={errors.password}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!busy}
        />
      </View>
      <TextLink prompt="New to IccheGhuri?" label="Create an account" onPress={() => router.replace("/register")} />
    </KeyboardForm>
  );
}
