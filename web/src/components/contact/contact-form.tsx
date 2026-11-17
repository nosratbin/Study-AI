"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert as MotionAlert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from "@/components/beui/alert";
import { StatefulButton, type ButtonState } from "@/components/beui/button/stateful";
import { Input as MotionInput } from "@/components/beui/input";
import { Button, Card, Field, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { contactSchema, zodErrors } from "@/lib/validation";

const EMPTY = { name: "", email: "", subject: "", message: "" };

/** Line the BeUI labels and messages up with the Field label above the textarea. */
const FLUSH = { label: "px-0", errorMessage: "px-0" };

/** "success" holds the button's Sent label for a beat before the card swaps to the sent state. */
type Status = "idle" | "sending" | "success" | "failed" | "sent";

const BUTTON_STATE: Record<Status, ButtonState> = { idle: "idle", sending: "loading", success: "success", failed: "error", sent: "success" };

/**
 * Contact form: POST /api/contact (backend `routes/public.py`, rate-limited, stored as a ContactMessage). Validation
 * mirrors the backend through `contactSchema`; API field errors map back onto the fields. The sent state is the page's
 * one moment: the brand kite lifts off where the form was.
 */
export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [errorOpen, setErrorOpen] = useState(false);

  const set = (k: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [k]: value }));

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      setForm(EMPTY);
      setStatus("sent");
    }, 700);
    return () => clearTimeout(t);
  }, [status]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending" || status === "success") return;
    setErrorOpen(false);
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      setStatus("idle");
      return setErrors(zodErrors(parsed.error));
    }
    setErrors({});
    setStatus("sending");
    try {
      await api("/contact", { method: "POST", body: parsed.data });
      setStatus("success");
    } catch (err) {
      setStatus("failed");
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setFormError(err.message);
      } else setFormError("Could not send your message.");
      setErrorOpen(true);
    }
  }

  if (status === "sent") {
    return (
      <Card className="p-6 sm:p-8">
        <div className="mx-auto w-16 animate-kite-launch motion-reduce:animate-none sm:w-20" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand vector */}
          <img src="/brand/iccheghuri-symbol.svg" alt="" width={256} height={256} className="h-auto w-full -rotate-6" />
        </div>
        <MotionAlert variant="success" className="mt-6">
          <AlertIcon />
          <AlertContent>
            <AlertTitle>Message sent</AlertTitle>
            <AlertDescription>Thanks for writing. We&apos;ll reply to the email address you gave us.</AlertDescription>
          </AlertContent>
        </MotionAlert>
        <Button variant="ghost" className="mt-4 w-full" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <MotionAlert variant="destructive" open={errorOpen} onOpenChange={setErrorOpen}>
          <AlertIcon />
          <AlertContent>
            <AlertDescription className="text-danger">{formError}</AlertDescription>
          </AlertContent>
        </MotionAlert>
        <div className="grid gap-5 sm:grid-cols-2">
          <MotionInput id="name" label="Name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} classNames={FLUSH} />
          <MotionInput id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} classNames={FLUSH} />
        </div>
        <MotionInput id="subject" label="Subject" value={form.subject} onChange={set("subject")} error={errors.subject} classNames={FLUSH} />
        <Field label="Message" htmlFor="message" error={errors.message}>
          <Textarea
            id="message"
            rows={6}
            value={form.message}
            onChange={(e) => set("message")(e.target.value)}
            invalid={!!errors.message}
            aria-describedby={errors.message ? "message-error" : undefined}
          />
        </Field>
        <StatefulButton
          type="submit"
          size="lg"
          className="w-full"
          state={BUTTON_STATE[status]}
          loadingText="Sending"
          successText="Sent"
          errorText="Try again"
        >
          Send message
        </StatefulButton>
      </form>
    </Card>
  );
}
