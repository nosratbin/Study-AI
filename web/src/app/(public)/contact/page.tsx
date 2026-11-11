"use client";

import { useState, type FormEvent } from "react";
import { PageHeader, Section } from "@/components/marketing";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { contactSchema, zodErrors } from "@/lib/validation";

const EMPTY = { name: "", email: "", subject: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) return setErrors(zodErrors(parsed.error));
    setErrors({});
    setStatus("sending");
    try {
      await api("/contact", { method: "POST", body: parsed.data });
      setStatus("sent");
      setForm(EMPTY);
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setFormError(err.message);
      } else setFormError("Could not send your message.");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to the IccheGhuri team">
        Schools, teachers, mentors and partners — send us a message and we&apos;ll get back to you.
      </PageHeader>
      <Section>
        <Card className="mx-auto max-w-xl p-6 sm:p-8">
          {status === "sent" ? (
            <Alert tone="success">Thanks! Your message has been received.</Alert>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              {formError && <Alert>{formError}</Alert>}
              <Field label="Name" htmlFor="name" error={errors.name}>
                <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} invalid={!!errors.name} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email}>
                <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} invalid={!!errors.email} />
              </Field>
              <Field label="Subject" htmlFor="subject" error={errors.subject}>
                <Input id="subject" value={form.subject} onChange={set("subject")} invalid={!!errors.subject} />
              </Field>
              <Field label="Message" htmlFor="message" error={errors.message}>
                <Textarea id="message" value={form.message} onChange={set("message")} invalid={!!errors.message} />
              </Field>
              <Button type="submit" loading={status === "sending"} className="w-full">
                Send message
              </Button>
            </form>
          )}
        </Card>
      </Section>
    </>
  );
}
