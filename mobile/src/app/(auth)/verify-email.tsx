/**
 * Enter the 6-digit code emailed after registering (or after signing in to an unverified account). The email comes from
 * useAuth().pending; opened without one (e.g. after the app was closed), the student enters their email to get a new
 * code. A correct code signs in, and the root guard moves on to onboarding.
 */
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { Button, FormError, Input } from "@/components/ui";
import { celebrate } from "@/components/motion";
import { KeyboardForm, Notice, ScreenTitle, TextLink } from "@/components/auth/auth-layout";
import { messageFor, splitApiError } from "@/components/auth/errors";
import { formatWait, isComplete, secondsLeft } from "@/components/auth/otp";
import { OtpInput, type OtpInputHandle } from "@/components/auth/otp-input";
import { Pressable, Text, View } from "@/tw";

/** Errors after which the typed code is useless, so the boxes are cleared for a fresh one. */
const CODE_REJECTED = new Set(["invalid_code", "code_expired", "too_many_attempts"]);

export default function VerifyEmail() {
  const { pending, setPending, verifyEmail, resendCode } = useAuth();
  const headerHeight = useHeaderHeight();
  const otp = useRef<OtpInputHandle>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [askEmail, setAskEmail] = useState("");
  const [askError, setAskError] = useState<string | undefined>();
  const [now, setNow] = useState(() => Date.now());

  const wait = pending ? secondsLeft(pending.resendAt, now) : 0;
  const counting = wait > 0;
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [counting]);

  async function submit(entered: string) {
    if (!pending || busy) return;
    if (!isComplete(entered)) {
      setError("Enter the 6-digit code from the email.");
      otp.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await verifyEmail(pending.email, entered);
      celebrate();
      // Signed in: the root guard replaces this stack, so there's nothing to navigate to here.
    } catch (e) {
      setBusy(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setError(e instanceof ApiError ? messageFor(e) : "Could not check the code. Try again.");
      if (e instanceof ApiError && CODE_REJECTED.has(e.code)) {
        setShakeKey((k) => k + 1);
        setCode("");
        // Let the cleared boxes render before focusing the field again.
        setTimeout(() => otp.current?.focus(), 0);
      }
    }
  }

  async function sendNew(email: string) {
    if (sending) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await resendCode(email);
      setNow(Date.now());
      setCode("");
      setNotice(`If ${next.email} is waiting to be verified, a new code is on its way. Check your spam folder too.`);
      setTimeout(() => otp.current?.focus(), 0);
    } catch (e) {
      const split = splitApiError(e, ["email"], "Could not send a new code. Try again.");
      if (pending) setError(split.fields.email ?? split.message);
      else {
        setAskError(split.fields.email);
        setError(split.message);
      }
    } finally {
      setSending(false);
    }
  }

  function startOver() {
    setPending(null);
    router.replace("/register");
  }

  if (!pending) {
    const submitAsk = () => {
      const parsed = loginSchema.shape.email.safeParse(askEmail);
      if (!parsed.success) return setAskError("Enter the email you signed up with.");
      setAskError(undefined);
      void sendNew(parsed.data.toLowerCase());
    };
    return (
      <KeyboardForm
        keyboardOffset={headerHeight}
        footer={
          <Button onPress={submitAsk} loading={sending}>
            Send code
          </Button>
        }
      >
        <ScreenTitle title="Verify your email" subtitle="Enter the email you signed up with and we'll send you a new code." />
        <View className="gap-4">
          <FormError message={error} />
          <Input
            label="Email"
            value={askEmail}
            onChangeText={(t) => {
              setAskEmail(t);
              setAskError(undefined);
            }}
            error={askError}
            placeholder="you@example.com"
            keyboardType="email-address"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            returnKeyType="send"
            onSubmitEditing={submitAsk}
            autoFocus
          />
        </View>
        <TextLink label="Back to sign in" onPress={() => router.replace("/login")} />
      </KeyboardForm>
    );
  }

  return (
    <KeyboardForm
      keyboardOffset={headerHeight}
      footer={
        <Button onPress={() => submit(code)} loading={busy} disabled={!isComplete(code)}>
          Verify email
        </Button>
      }
    >
      <ScreenTitle title="Check your email">
        <Text className="text-[15px] leading-[22px] text-muted">
          We sent a 6-digit code to <Text className="font-semibold text-ink">{pending.email}</Text>. It can take a minute to arrive.
        </Text>
      </ScreenTitle>
      <View className="gap-3">
        <OtpInput
          ref={otp}
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          onComplete={submit}
          error={!!error}
          shakeKey={shakeKey}
          disabled={busy}
          describedBy={`Code sent to ${pending.email}`}
          autoFocus
        />
        {error ? (
          <Text className="text-[13px] leading-[18px] text-danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Notice message={notice} />
      </View>
      <View className="items-center gap-1">
        {counting ? (
          <View className="min-h-12 justify-center" accessibilityLiveRegion="none">
            <Text className="text-[15px] leading-[22px] text-muted" style={{ fontVariant: ["tabular-nums"] }}>
              Didn&apos;t get it? Send a new code in {formatWait(wait)}
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap items-center justify-center">
            <Text className="text-[15px] leading-[22px] text-muted">Didn&apos;t get it? </Text>
            <Pressable
              onPress={() => sendNew(pending.email)}
              disabled={sending}
              accessibilityRole="button"
              accessibilityState={{ disabled: sending, busy: sending }}
              hitSlop={8}
              className="min-h-12 justify-center px-1 active:opacity-60"
            >
              <Text className="text-[15px] leading-[22px] font-semibold text-brand-700">{sending ? "Sending…" : "Send a new code"}</Text>
            </Pressable>
          </View>
        )}
        <TextLink prompt="Wrong email?" label="Start over" onPress={startOver} />
      </View>
    </KeyboardForm>
  );
}
