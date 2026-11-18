/** Turn anything an auth or onboarding request throws into inline field errors plus one form-level message. */
import { ApiError } from "@/lib/api";

export interface FormErrors {
  fields: Record<string, string>;
  message: string | null;
}

/**
 * Validation details for `fields` the form shows are put under those fields; anything else (offline, rate limits,
 * server errors, details for fields the form doesn't have) becomes the form-level message.
 */
export function splitApiError(e: unknown, fields: readonly string[], fallback = "Something went wrong. Please try again."): FormErrors {
  if (!(e instanceof ApiError)) return { fields: {}, message: fallback };
  const all = e.fieldErrors();
  const known: Record<string, string> = {};
  const unknown: string[] = [];
  for (const [k, v] of Object.entries(all)) {
    if (fields.includes(k)) known[k] = v;
    else unknown.push(v);
  }
  if (Object.keys(known).length) return { fields: known, message: unknown[0] ?? null };
  return { fields: {}, message: messageFor(e) };
}

/** The user-facing message for an ApiError, with friendlier wording for the cases the backend words generically. */
export function messageFor(e: ApiError): string {
  if (e.code === "network_error" || e.status === 0) return "You're offline. Check your connection and try again.";
  if (e.code === "rate_limited") return "Too many tries. Wait a minute, then try again.";
  if (e.status >= 500 && e.code !== "email_not_configured") return "The server isn't responding. Please try again shortly.";
  return e.message;
}
