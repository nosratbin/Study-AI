/**
 * The email waiting to be verified, kept in sessionStorage between the register or sign-in page and /verify-email, so
 * the address never sits in the URL. Holds the time the next code may be requested, so a reload keeps the countdown.
 */
import { api } from "./api";

export interface PendingVerification {
  email: string;
  /** Epoch ms when "Send a new code" unlocks. */
  resendAt: number;
}

const KEY = "iccheghuri:verify-email";

export function rememberPending(email: string, resendAfterSeconds: number): PendingVerification {
  const pending = { email, resendAt: Date.now() + resendAfterSeconds * 1000 };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* storage blocked: the verify page asks for the email instead */
  }
  return pending;
}

export function readPending(): PendingVerification | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Partial<PendingVerification>) : null;
    return v && typeof v.email === "string" && typeof v.resendAt === "number" ? { email: v.email, resendAt: v.resendAt } : null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Ask for a new code. The answer is the same whether or not the account exists. */
export async function resendCode(email: string): Promise<PendingVerification> {
  const r = await api<{ email: string; resend_after: number }>("/auth/verify-email/resend", { method: "POST", body: { email } });
  return rememberPending(r.email, r.resend_after);
}
