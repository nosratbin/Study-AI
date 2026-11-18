/**
 * Create a student account. Registration only emails a code (no session yet), so success continues to verify-email.
 * Validation mirrors the backend through registerSchema (password rules, no plus-aliases).
 */
import { useRef, useState } from "react";
import type { TextInputInstance } from "react-native";
import { router } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { registerSchema, zodErrors } from "@/lib/validation";
import { Button, FormError, Input as Field } from "@/components/ui";
import { KeyboardForm, ScreenTitle, TextLink } from "@/components/auth/auth-layout";
import { GoogleButton } from "@/components/auth/google-button";
import { splitApiError } from "@/components/auth/errors";
import { Text, View } from "@/tw";

const FIELDS = ["full_name", "email", "password", "confirm"] as const;
type FieldName = (typeof FIELDS)[number];
type Values = Record<FieldName, string>;

export default function Register() {
  const { register } = useAuth();
  const headerHeight = useHeaderHeight();
  const nameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const [values, setValues] = useState<Values>({ full_name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  function check(v: Values) {
    const parsed = registerSchema.safeParse(v);
    return parsed.success ? {} : zodErrors(parsed.error);
  }

  function set(key: FieldName, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (key === "email") setEmailTaken(false);
    if (submitted) setErrors(check(next));
  }

  async function submit() {
    if (busy) return;
    setSubmitted(true);
    setFormError(null);
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = zodErrors(parsed.error);
      setErrors(fieldErrors);
      // Take the student to the first field that needs fixing.
      const first = FIELDS.find((f) => fieldErrors[f]) ?? "full_name";
      ({ full_name: nameRef, email: emailRef, password: passwordRef, confirm: confirmRef })[first].current?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { full_name, email, password } = parsed.data;
      await register(full_name, email, password);
      setBusy(false);
      router.push("/verify-email");
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === "email_taken") {
        setEmailTaken(true);
        setErrors({ email: e.message });
        return;
      }
      const split = splitApiError(e, FIELDS, "Registration failed. Please try again.");
      setErrors(split.fields);
      setFormError(split.message);
    }
  }

  return (
    <KeyboardForm
      keyboardOffset={headerHeight}
      footer={
        <Button onPress={submit} loading={busy}>
          Create account
        </Button>
      }
    >
      <ScreenTitle title="Create your account" subtitle="Free for students. Takes less than a minute." />
      <GoogleButton disabled={busy} />
      <View className="gap-4">
        <FormError message={formError} />
        <Field
          ref={nameRef}
          label="Full name"
          value={values.full_name}
          onChangeText={(t) => set("full_name", t)}
          error={errors.full_name}
          placeholder="Ayesha Rahman"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!busy}
        />
        <View className="gap-1">
          <Field
            ref={emailRef}
            label="Email"
            value={values.email}
            onChangeText={(t) => set("email", t)}
            error={errors.email}
            hint="We'll send a 6-digit code to check it's yours."
            placeholder="you@example.com"
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!busy}
          />
          {emailTaken ? <TextLink label="Sign in instead" onPress={() => router.replace("/login")} className="justify-start" /> : null}
        </View>
        <Field
          ref={passwordRef}
          label="Password"
          secure
          value={values.password}
          onChangeText={(t) => set("password", t)}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          passwordRules="minlength: 8; required: lower, upper; required: digit;"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!busy}
        />
        <Field
          ref={confirmRef}
          label="Confirm password"
          secure
          value={values.confirm}
          onChangeText={(t) => set("confirm", t)}
          error={errors.confirm}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!busy}
        />
      </View>
      <View className="gap-1">
        <TextLink prompt="Already have an account?" label="Sign in" onPress={() => router.replace("/login")} />
        <Text className="text-center text-[13px] leading-[18px] text-muted">Teacher or mentor? Accounts are set up by an IccheGhuri admin.</Text>
      </View>
    </KeyboardForm>
  );
}
