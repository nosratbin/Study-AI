"use client";
// beui.dev/components/blocks/signup-form, adapted for IccheGhuri:
// - fields are full name, email and password, validated by the caller (the zod schema that mirrors the backend);
// - no terms box (there are no terms pages yet);
// - server field errors (email taken, alias) show on their field until that field changes;
// - no outer border: the auth page's Card frames it.

import { Mail, User } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { StatefulButton, type ButtonState } from "./button/stateful";
import { Input } from "./input";
import { EASE_OUT, SPRING_LAYOUT } from "./lib/ease";
import { PasswordInput } from "./password-input";

export type SignUpValues = { full_name: string; email: string; password: string; confirm: string };
export type SignUpErrors = Partial<Record<keyof SignUpValues, string>>;

export interface SignUpFormProps {
  /** Return a message per invalid field. */
  validate: (values: SignUpValues) => SignUpErrors;
  /** Called with valid values only. */
  onSubmit: (values: SignUpValues) => void | Promise<void>;
  status: ButtonState;
  /** Form-level failure, shown above the submit button. */
  errorMessage?: string;
  /** Field errors from the API; each hides once its field is edited. */
  serverErrors?: SignUpErrors;
  footer?: ReactNode;
  className?: string;
}

const EMPTY: SignUpValues = { full_name: "", email: "", password: "", confirm: "" };
const PASSWORD_RULE = "At least 8 characters, with a letter and a number.";

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;
const STRENGTH_COLORS = ["bg-danger", "bg-danger", "bg-amber-500", "bg-amber-400", "bg-success"] as const;

/**
 * Length-weighted strength score, 0-4. NIST SP 800-63B treats length as the dominant factor, so extra character
 * classes only nudge the score. Feedback only: the backend's rules decide what is accepted.
 */
export function passwordStrength(password: string): number {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((p) => p.test(password)).length;
  if (classes >= 3) score += 1;
  return Math.min(score, 4);
}

export function SignUpForm({ validate, onSubmit, status, errorMessage, serverErrors, footer, className }: SignUpFormProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [values, setValues] = useState<SignUpValues>(EMPTY);
  // Errors show once a field is blurred (or on submit) and clear as soon as it becomes valid.
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpValues, boolean>>>({});
  const [server, setServer] = useState<SignUpErrors>({});
  const [lastServer, setLastServer] = useState(serverErrors);
  if (serverErrors !== lastServer) {
    setLastServer(serverErrors);
    setServer(serverErrors ?? {});
  }

  const errors = useMemo(() => validate(values), [validate, values]);
  const shownError = (key: keyof SignUpValues) => server[key] ?? (touched[key] ? errors[key] : undefined);
  const isValid = (key: keyof SignUpValues) => Boolean(touched[key]) && !errors[key] && !server[key] && Boolean(values[key]);

  const set = (key: keyof SignUpValues) => (next: string) => {
    setValues((v) => ({ ...v, [key]: next }));
    if (server[key])
      setServer((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
  };
  const touch = (key: keyof SignUpValues) => () => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));

  const strength = passwordStrength(values.password);
  const busy = status === "loading" || status === "success";
  const ruleId = `${baseId}-password-rule`;
  const strengthId = `${baseId}-strength`;
  const formErrorId = `${baseId}-form-error`;
  const passwordId = `${baseId}-password`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ full_name: true, email: true, password: true, confirm: true });
    if (busy || Object.keys(errors).length > 0) return;
    await onSubmit(values);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-1">
        <Input
          id="full_name"
          name="full_name"
          label="Full name"
          autoComplete="name"
          enterKeyHint="next"
          required
          placeholder="Ayesha Rahman"
          leftIcon={<User />}
          disabled={busy}
          value={values.full_name}
          onChange={set("full_name")}
          onBlur={touch("full_name")}
          error={shownError("full_name")}
          reserveErrorLine
          success={isValid("full_name")}
          classNames={{ label: "px-0", errorMessage: "px-0" }}
        />
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
          success={isValid("email")}
          classNames={{ label: "px-0", errorMessage: "px-0" }}
        />

        <div className="flex flex-col gap-1.5">
          {/* Label and rule sit above the field so the keyboard and password-manager popups never cover the rule. */}
          <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
            Password
          </label>
          <p id={ruleId} className="-mt-1 text-xs text-muted">
            {PASSWORD_RULE}
          </p>
          <PasswordInput
            id={passwordId}
            name="new-password"
            autoComplete="new-password"
            enterKeyHint="next"
            required
            disabled={busy}
            value={values.password}
            onChange={set("password")}
            onBlur={touch("password")}
            error={shownError("password")}
            aria-describedby={[ruleId, values.password ? strengthId : null, shownError("password") ? `${passwordId}-error` : null].filter(Boolean).join(" ")}
            reserveErrorLine
            classNames={{ errorMessage: "px-0" }}
          />
          <AnimatePresence initial={false}>
            {values.password ? (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="flex flex-col gap-1.5"
              >
                <div className="flex gap-1.5" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                      {/* scaleX, not width: transform only, off layout. */}
                      <motion.span
                        initial={false}
                        animate={{ scaleX: i < strength ? 1 : 0 }}
                        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                        className={cn("block h-full w-full origin-left rounded-full", STRENGTH_COLORS[strength])}
                      />
                    </span>
                  ))}
                </div>
                <p id={strengthId} className="text-xs text-muted">
                  Password strength: {STRENGTH_LABELS[strength]}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <PasswordInput
          id="confirm-password"
          name="confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          enterKeyHint="done"
          required
          placeholder="Type it again"
          disabled={busy}
          value={values.confirm}
          onChange={set("confirm")}
          onBlur={touch("confirm")}
          error={shownError("confirm")}
          reserveErrorLine
          classNames={{ label: "px-0", errorMessage: "px-0" }}
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
        loadingText="Creating account"
        successText="Code sent"
        errorText="Try again"
        aria-describedby={errorMessage ? formErrorId : undefined}
        className="w-full"
      >
        Create account
      </StatefulButton>

      {footer ? <div className="text-center text-sm text-muted">{footer}</div> : null}
    </form>
  );
}
