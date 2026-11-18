/**
 * Pure logic for the verification code input (src/components/auth/otp-input.tsx), kept separate so it can be
 * unit-tested. The input is one hidden TextInput behind six visual boxes, so typing, backspace, paste and autofill are
 * all plain text edits; this file only cleans and limits that text.
 */
export const CODE_LENGTH = 6;

export function onlyDigits(text: string): string {
  // Bangla digits are folded to ASCII, so a code typed on a Bangla keyboard still works.
  return Array.from(text)
    .map((ch) => {
      const bn = "০১২৩৪৫৬৭৮৯".indexOf(ch);
      return bn >= 0 ? String(bn) : ch;
    })
    .join("")
    .replace(/\D/g, "");
}

/**
 * The code after the input reports `text`. There's no native maxLength, because Android truncates a paste to fit
 * before JS sees it ("12" + paste "482913" would become "124829"). Over-long text is resolved here instead: a whole
 * code pasted or autofilled next to earlier digits replaces them, and a digit typed into a full code is ignored.
 */
export function nextCode(prev: string, text: string, length = CODE_LENGTH): string {
  const digits = onlyDigits(text);
  if (digits.length <= length) return digits;
  const added = digits.startsWith(prev) ? digits.slice(prev.length) : digits.endsWith(prev) ? digits.slice(0, digits.length - prev.length) : "";
  if (added.length >= length) return added.slice(0, length);
  return prev.length >= length ? prev : digits.slice(0, length);
}

export function isComplete(code: string, length = CODE_LENGTH): boolean {
  return code.length === length && /^\d+$/.test(code);
}

/** Whole seconds until `resendAt` (epoch ms), never negative. */
export function secondsLeft(resendAt: number, now: number): number {
  return Math.max(0, Math.ceil((resendAt - now) / 1000));
}

/** "1:05" for 65 seconds. */
export function formatWait(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
