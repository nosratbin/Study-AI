"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { StatefulButton, type ButtonState } from "@/components/beui/button/stateful";
import { Input } from "@/components/beui/input";
import { OTPInput, type OTPStatus } from "@/components/beui/otp-input";
import { Alert, Card } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";
import { clearPending, readPending, resendCode, type PendingVerification } from "@/lib/verification";

const CODE = /^\d{6}$/;

/** "Checking the link" while a #token link is verified, "code" for the 6-digit form, "ask" when we don't know the email. */
type Mode = "start" | "link" | "code" | "ask";

function formatWait(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function VerifyEmailPage() {
  const { user, loading, verifyEmail, verifyEmailLink } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("start");
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [code, setCode] = useState("");
  const [otpStatus, setOtpStatus] = useState<OTPStatus>("idle");
  const [button, setButton] = useState<ButtonState>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [askEmail, setAskEmail] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(false);
  const finishing = useRef(false);

  function finish(u: User) {
    clearPending();
    setOtpStatus("success");
    setButton("success");
    // A beat for the check mark, then into the app.
    setTimeout(() => router.replace(homeFor(u)), 600);
  }

  // Runs once (the ref survives React's dev double-invoke). The emailed link carries its token in the #fragment, which
  // the browser never sends to a server; drop it from the address bar and history before using it.
  /* eslint-disable react-hooks/set-state-in-effect -- a one-time read of the URL fragment and sessionStorage, which only
     exist in the browser; reading them during render would differ between the server and client renders. */
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    const saved = readPending();
    setPending(saved);
    if (!token) {
      setMode(saved ? "code" : "ask");
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    setMode("link");
    finishing.current = true;
    verifyEmailLink(token).then(finish, (e) => {
      finishing.current = false;
      setError(e instanceof ApiError ? e.message : "Could not check the link. Enter the code from the email instead.");
      setMode(saved ? "code" : "ask");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page load
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Already signed in (and not because of this page): nothing to verify.
  useEffect(() => {
    if (!loading && user && !finishing.current && mode !== "start") router.replace(homeFor(user));
  }, [user, loading, mode, router]);

  const wait = pending ? Math.max(0, Math.ceil((pending.resendAt - now) / 1000)) : 0;
  const counting = wait > 0;
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [counting]);

  async function submit(value: string) {
    if (!pending || button === "loading" || button === "success") return;
    if (!CODE.test(value)) {
      setOtpStatus("error");
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setError("");
    setNotice("");
    setButton("loading");
    finishing.current = true;
    try {
      finish(await verifyEmail(pending.email, value));
    } catch (e) {
      finishing.current = false;
      setOtpStatus("error");
      setButton("error");
      setError(e instanceof ApiError ? e.message : "Could not check the code. Try again.");
    }
  }

  async function sendNew(email: string) {
    setError("");
    setNotice("");
    try {
      const next = await resendCode(email);
      setPending(next);
      setNow(Date.now());
      setCode("");
      setOtpStatus("idle");
      setButton("idle");
      setMode("code");
      setNotice(`If ${next.email} is waiting to be verified, a new code is on its way. Check your spam folder too.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send a new code. Try again.");
    }
  }

  function onAsk(e: FormEvent) {
    e.preventDefault();
    const email = askEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter the email you signed up with.");
    void sendNew(email);
  }

  if (mode === "start" || mode === "link") {
    return (
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3" role="status">
          <Loader2 className="size-5 animate-spin text-brand-600 motion-reduce:animate-none" aria-hidden />
          <p className="text-sm text-muted">{mode === "link" ? "Checking your link" : "Loading"}</p>
        </div>
      </Card>
    );
  }

  if (mode === "ask") {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
        <p className="mt-1 text-sm text-muted">Enter the email you signed up with and we&apos;ll send you a new code.</p>
        <form onSubmit={onAsk} noValidate className="mt-6 flex flex-col gap-5">
          {error && <Alert>{error}</Alert>}
          <Input
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="username"
            spellCheck={false}
            required
            placeholder="you@example.com"
            leftIcon={<Mail />}
            value={askEmail}
            onChange={setAskEmail}
            classNames={{ label: "px-0" }}
          />
          <StatefulButton type="submit" size="lg" className="w-full">
            Send code
          </StatefulButton>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
      <p id="code-hint" className="mt-1 text-sm text-muted">
        We sent a 6-digit code to <span className="font-medium text-ink">{pending?.email}</span>. Enter it here, or open the link in
        the email.
      </p>
      <form
        className="mt-6 flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        {error && otpStatus !== "error" && <Alert>{error}</Alert>}
        {notice && <p className="rounded-xl border border-line bg-muted-bg px-3 py-2 text-sm text-ink" role="status">{notice}</p>}
        <OTPInput
          name="code"
          label="Verification code"
          aria-describedby="code-hint"
          autoFocus
          value={code}
          onChange={(v) => {
            setCode(v);
            if (otpStatus === "error") setOtpStatus("idle");
            if (button === "error") setButton("idle");
          }}
          onComplete={(v) => void submit(v)}
          status={otpStatus}
          errorMessage={error}
          successMessage="Email verified"
          disabled={button === "loading" || button === "success"}
          className="w-full items-center [&>label]:self-start"
        />
        <StatefulButton
          type="submit"
          size="lg"
          state={button}
          loadingText="Checking"
          successText="Verified"
          errorText="Try again"
          className="w-full"
        >
          Verify email
        </StatefulButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Didn&apos;t get it?{" "}
        {counting ? (
          <span className="tabular-nums">Send a new code in {formatWait(wait)}</span>
        ) : (
          <button type="button" onClick={() => pending && void sendNew(pending.email)} className="font-semibold text-brand-600 hover:underline">
            Send a new code
          </button>
        )}
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Wrong email?{" "}
        <Link href="/register" onClick={clearPending} className="font-semibold text-brand-600 hover:underline">
          Start over
        </Link>
      </p>
    </Card>
  );
}
