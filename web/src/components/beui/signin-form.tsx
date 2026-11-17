"use client";
// Sign-in companion to beui.dev/components/blocks/signup-form (BeUI has no sign-in block): same fields, error timing,
// form-level alert and stateful submit, with email and current password only.

import { Mail } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { StatefulButton, type ButtonState } from "./button/stateful";
import { Input } from "./input";
import { PasswordInput } from "./password-input";

export type SignInValues = { email: string; password: string };
export type SignInErrors = Partial<Record<keyof SignInValues, string>>;

export interface SignInFormProps {
  validate: (values: SignInValues) => SignInErrors;
  onSubmit: (values: SignInValues) => void | Promise<void>;
  status: ButtonState;
  errorMessage?: string;
  className?: string;
}

const FLUSH = { label: "px-0", errorMessage: "px-0" };

export function SignInForm({ validate, onSubmit, status, errorMessage, className }: SignInFormProps) {
  const reduce = useReducedMotion();
  const formErrorId = `${useId()}-form-error`;
  const [values, setValues] = useState<SignInValues>({ email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<keyof SignInValues, boolean>>>({});

  const errors = useMemo(() => validate(values), [validate, values]);
  const shownError = (key: keyof SignInValues) => (touched[key] ? errors[key] : undefined);
  const set = (key: keyof SignInValues) => (next: string) => setValues((v) => ({ ...v, [key]: next }));
  const touch = (key: keyof SignInValues) => () => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  const busy = status === "loading" || status === "success";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (busy || Object.keys(errors).length > 0) return;
    await onSubmit(values);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-1">
        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="username"
          spellCheck={false}
          enterKeyHint="next"
          required
          placeholder="you@example.com"
          leftIcon={<Mail />}
          disabled={busy}
          value={values.email}
          onChange={set("email")}
          onBlur={touch("email")}
          error={shownError("email")}
          reserveErrorLine
          classNames={FLUSH}
        />
        <PasswordInput
          id="current-password"
          name="current-password"
          label="Password"
          autoComplete="current-password"
          enterKeyHint="go"
          required
          disabled={busy}
          value={values.password}
          onChange={set("password")}
          onBlur={touch("password")}
          error={shownError("password")}
          reserveErrorLine
          classNames={FLUSH}
        />
      </div>

      <AnimatePresence initial={false}>
        {errorMessage ? (
          <motion.p
            id={formErrorId}
            role="alert"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-danger/30 bg-danger-50 px-3 py-2 text-sm text-danger"
          >
            {errorMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <StatefulButton
        type="submit"
        size="lg"
        state={status}
        loadingText="Signing in"
        successText="Signed in"
        errorText="Try again"
        aria-describedby={errorMessage ? formErrorId : undefined}
        className="w-full"
      >
        Sign in
      </StatefulButton>
    </form>
  );
}
