"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { isGoogleSignInConfigured } from "@/lib/firebase";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function GoogleButton({ onError }: { onError: (msg: string) => void }) {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!isGoogleSignInConfigured) {
    return (
      <div className="space-y-1.5">
        <Button type="button" variant="secondary" className="w-full" disabled>
          <GoogleMark /> Continue with Google
        </Button>
        <p className="text-center text-xs text-muted">Google Sign-In isn&apos;t configured on this deployment yet.</p>
      </div>
    );
  }

  async function onClick() {
    setBusy(true);
    try {
      const user = await loginWithGoogle();
      router.replace(homeFor(user));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      onError(e instanceof ApiError ? e.message : "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="secondary" className="w-full" onClick={onClick} loading={busy}>
      {!busy && <GoogleMark />} Continue with Google
    </Button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}
