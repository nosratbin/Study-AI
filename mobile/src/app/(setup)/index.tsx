/**
 * Onboarding: one question per screen, with progress at the top and Back / Continue in the thumb zone. Submits to
 * POST /students/onboarding, then reloads the user so the root guard moves the student into the app.
 *
 * This is `(setup)/index` because the root guard redirects to the group's URL, "/(setup)", which only matches an index
 * route (see src/components/auth/__tests__/auth-routing.test.tsx).
 */
import { useEffect, useState } from "react";
import { Alert, BackHandler, Keyboard } from "react-native";
import { Easing, FadeInLeft, FadeInRight, ReduceMotion } from "react-native-reanimated";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { StudentProfile } from "@/lib/types";
import { Button, FormError } from "@/components/ui";
import { celebrate } from "@/components/motion";
import { KeyboardForm } from "@/components/auth/auth-layout";
import { splitApiError } from "@/components/auth/errors";
import {
  CLASS_OPTIONS,
  errorsForStep,
  firstStepWithError,
  INITIAL_FORM,
  OPTIONAL_STEPS,
  STEP_FIELDS,
  stepsFor,
  toPayload,
  validate,
  type OnboardingForm,
  type StepKey,
} from "@/components/auth/onboarding";
import {
  BirthYearStep,
  ConsentStep,
  DistrictStep,
  GoalsStep,
  InstitutionStep,
  InterestsStep,
  LanguageStep,
  LevelStep,
  type SetField,
} from "@/components/auth/onboarding-steps";
import { StepProgress } from "@/components/auth/step-progress";
import { AnimatedView, Pressable, Text, View } from "@/tw";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const ALL_FIELDS = Object.values(STEP_FIELDS).flat() as string[];
const RELOAD_FAILED = "Saved. Couldn't continue. Check your connection and tap to retry.";

/** What "Skip" clears on each optional step. */
const SKIP_VALUES: Partial<Record<StepKey, Partial<OnboardingForm>>> = {
  institution: { institution: "", class_or_year: "" },
  district: { district: "" },
  interests: { interests: [] },
  goals: { goals: "" },
};

export default function Onboarding() {
  const { user, reload, logout } = useAuth();
  const [form, setForm] = useState<OnboardingForm>(INITIAL_FORM);
  const [stepKey, setStepKey] = useState<StepKey>("level");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The profile is saved but /auth/me couldn't be reached to move on. From here only the reload is retried, never the POST.
  const [saved, setSaved] = useState(false);

  const steps = stepsFor(form);
  const index = Math.max(0, steps.indexOf(stepKey));
  const isLast = index === steps.length - 1;
  const optional = OPTIONAL_STEPS.has(stepKey);

  const set: SetField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // A class picked for another level doesn't fit the new one.
      const levelChanged = key === "education_level" && value !== f.education_level;
      if (levelChanged && f.education_level && CLASS_OPTIONS[f.education_level].includes(f.class_or_year)) {
        next.class_or_year = "";
      }
      return next;
    });
    setErrors((e) => {
      if (!e[key]) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  };

  function go(to: number, dir: 1 | -1, list = steps) {
    Keyboard.dismiss();
    setDirection(dir);
    setErrors({});
    setFormError(null);
    setStepKey(list[Math.min(Math.max(to, 0), list.length - 1)]);
  }

  // Android back steps backwards through the questions; on the first one it does the default (leave the app).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (busy) return true;
      if (index === 0 || saved) return false;
      go(index - 1, -1);
      return true;
    });
    return () => sub.remove();
  });

  async function submit(final: OnboardingForm) {
    const all = validate(final);
    const finalSteps = stepsFor(final);
    const bad = firstStepWithError(all, finalSteps);
    if (bad >= 0) {
      go(bad, -1, finalSteps);
      setErrors(errorsForStep(all, finalSteps[bad]));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await api<StudentProfile>("/students/onboarding", { method: "POST", body: toPayload(final) });
    } catch (e) {
      setBusy(false);
      const split = splitApiError(e, ALL_FIELDS, "Could not save your profile. Please try again.");
      const isConsent = e instanceof ApiError && e.code === "guardian_consent_required";
      const fieldErrors = isConsent ? { guardian_consent: split.message ?? "" } : split.fields;
      const at = firstStepWithError(fieldErrors, finalSteps);
      if (at >= 0) {
        go(at, -1, finalSteps);
        setErrors(errorsForStep(fieldErrors, finalSteps[at]));
        if (!isConsent) setFormError(split.message);
      } else {
        setFormError(split.message);
      }
      return;
    }
    setSaved(true);
    celebrate();
    await enterApp();
  }

  /** Reload the user so the root guard swaps (setup) for (app). False means the server couldn't be reached. */
  async function enterApp() {
    setBusy(true);
    setFormError(null);
    const ok = await reload().catch(() => false);
    setBusy(false);
    if (!ok) setFormError(RELOAD_FAILED);
  }

  function next() {
    if (busy) return;
    if (saved) return void enterApp();
    const stepErrors = errorsForStep(validate(form), stepKey);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    if (isLast) void submit(form);
    else go(index + 1, 1);
  }

  function skip() {
    if (busy || saved) return;
    const cleared = { ...form, ...SKIP_VALUES[stepKey] };
    setForm(cleared);
    if (isLast) void submit(cleared);
    else go(index + 1, 1);
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "Your answers on this screen won't be saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void logout() },
    ]);
  }

  const firstName = user?.full_name.split(" ")[0] ?? "";
  const stepProps = { form, set, errors };
  const entering = (direction === 1 ? FadeInRight : FadeInLeft).duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

  return (
    <KeyboardForm
      edges={["top", "bottom"]}
      scroll={false}
      footer={
        <>
          <FormError message={formError} />
          <View className="flex-row gap-3">
            {index > 0 && !saved ? (
              <Button variant="secondary" icon="arrow-back" accessibilityLabel="Back" onPress={() => go(index - 1, -1)} disabled={busy} className="flex-1">
                Back
              </Button>
            ) : null}
            <Button onPress={next} loading={busy} className="flex-[2]">
              {saved ? "Try again" : isLast ? "Finish setup" : "Continue"}
            </Button>
          </View>
        </>
      }
    >
      <View className="gap-1">
        <View className="min-h-12 flex-row items-center justify-between">
          <Text className="text-[13px] leading-[18px] text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            Step {index + 1} of {steps.length}
          </Text>
          {saved ? null : optional ? (
            <Pressable onPress={skip} disabled={busy} accessibilityRole="button" accessibilityLabel="Skip this question" hitSlop={8} className="min-h-12 justify-center px-2 active:opacity-60">
              <Text className="text-[15px] leading-[22px] font-semibold text-muted">Skip</Text>
            </Pressable>
          ) : index === 0 ? (
            <Pressable onPress={confirmSignOut} accessibilityRole="button" hitSlop={8} className="min-h-12 justify-center px-2 active:opacity-60">
              <Text className="text-[15px] leading-[22px] text-muted">Sign out</Text>
            </Pressable>
          ) : null}
        </View>
        <StepProgress step={index} total={steps.length} />
      </View>

      <AnimatedView key={stepKey} entering={entering} className="flex-1">
        {stepKey === "level" ? <LevelStep {...stepProps} firstName={firstName} /> : null}
        {stepKey === "institution" ? <InstitutionStep {...stepProps} /> : null}
        {stepKey === "district" ? <DistrictStep {...stepProps} /> : null}
        {stepKey === "birth_year" ? <BirthYearStep {...stepProps} /> : null}
        {stepKey === "consent" ? <ConsentStep {...stepProps} /> : null}
        {stepKey === "language" ? <LanguageStep {...stepProps} /> : null}
        {stepKey === "interests" ? <InterestsStep {...stepProps} /> : null}
        {stepKey === "goals" ? <GoalsStep {...stepProps} /> : null}
      </AnimatedView>
    </KeyboardForm>
  );
}
