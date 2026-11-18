/**
 * One body per onboarding question (src/app/(setup)/index.tsx owns the stepper, the footer and submitting). Each step
 * scrolls itself, so the district list can be a FlatList without nesting it in a ScrollView.
 */
import { useState, type ReactNode } from "react";
import { FlatList, Keyboard, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/lib/cn";
import { LEVELS, type EducationLevel } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Chip, Input } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { ScreenTitle } from "./auth-layout";
import { kindsLabel, useDistricts, useInstitutionSearch } from "./edu-directory";
import { OptionCard } from "./option-card";
import { birthYears, CLASS_OPTIONS, filterDistricts, INTERESTS, suggestedBirthYear, type OnboardingForm } from "./onboarding";
import { YearWheel } from "./year-wheel";

export type SetField = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => void;

interface StepProps {
  form: OnboardingForm;
  set: SetField;
  errors: Record<string, string>;
}

function StepScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-6 pb-6" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {children}
    </ScrollView>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text className="text-[13px] leading-[18px] text-danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <Text className="text-[13px] leading-[18px] text-muted">{children}</Text>;
}

/* ---------- Level ---------- */

export function LevelStep({ form, set, errors, firstName }: StepProps & { firstName: string }) {
  return (
    <StepScroll>
      <ScreenTitle
        title={firstName ? `Hi ${firstName}, where are you studying now?` : "Where are you studying now?"}
        subtitle="This shapes your courses, the tutor's explanations and your projects. You can change it later."
      />
      <View className="gap-3" accessibilityRole="radiogroup">
        {LEVELS.map((l) => (
          <OptionCard
            key={l.value}
            title={l.label}
            eyebrow={l.tag}
            body={l.blurb}
            selected={form.education_level === l.value}
            onPress={() => set("education_level", l.value)}
          />
        ))}
      </View>
      <FieldError message={errors.education_level} />
    </StepScroll>
  );
}

/* ---------- Institution and class ---------- */

const INSTITUTION_PLACEHOLDER: Record<EducationLevel | "", string> = {
  school: "e.g. Motijheel Govt. Boys' High School",
  college: "e.g. Notre Dame College",
  university: "e.g. University of Dhaka",
  "": "Start typing the name",
};

export function InstitutionStep({ form, set, errors }: StepProps) {
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState(form.institution);
  const search = useInstitutionSearch(form.institution, form.education_level);
  const items = search.data?.items ?? [];
  const typed = form.institution.trim();
  const showList = focused && typed.length >= 2 && form.institution !== picked;
  const classes = form.education_level ? CLASS_OPTIONS[form.education_level] : [];
  const [other, setOther] = useState(!!form.class_or_year && !classes.includes(form.class_or_year));

  return (
    <StepScroll>
      <ScreenTitle title="Where do you study?" subtitle="Optional. Pick from the list or type the name. You can change it later." />
      <View className="gap-2">
        <Input
          label="School, college or university"
          value={form.institution}
          onChangeText={(t) => set("institution", t)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          error={errors.institution}
          placeholder={INSTITUTION_PLACEHOLDER[form.education_level]}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={200}
        />
        {showList ? (
          <View className="overflow-hidden rounded-2xl bg-card py-1" accessibilityLabel="Suggestions">
            {search.isLoading && !items.length ? (
              <View className="gap-3 px-4 py-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </View>
            ) : items.length ? (
              // At most 8 suggestions (the API's limit), so a plain map is fine here.
              items.map((i) => (
                <Pressable
                  key={i.name}
                  onPress={() => {
                    set("institution", i.name);
                    setPicked(i.name);
                    Keyboard.dismiss();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${i.name}${i.kinds.length ? `, ${kindsLabel(i.kinds)}` : ""}`}
                  className="min-h-12 justify-center gap-0.5 px-4 py-2.5 active:bg-muted-bg"
                >
                  <Text className="text-[15px] leading-[22px] text-ink">{i.name}</Text>
                  {i.kinds.length ? <Caption>{kindsLabel(i.kinds)}</Caption> : null}
                </Pressable>
              ))
            ) : (
              <View className="px-4 py-3">
                <Caption>
                  {search.isError ? "Couldn't load suggestions. You can still type the name." : `Not in our list yet. We'll save “${typed}” as you typed it.`}
                </Caption>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {classes.length ? (
        <View className="gap-3">
          <Text className="text-[17px] leading-[24px] font-semibold text-ink" accessibilityRole="header">
            Class or year
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {classes.map((label) => (
              <Chip
                key={label}
                label={label}
                selected={!other && form.class_or_year === label}
                onPress={() => {
                  setOther(false);
                  set("class_or_year", form.class_or_year === label ? "" : label);
                }}
              />
            ))}
            <Chip
              label="Other"
              selected={other}
              onPress={() => {
                setOther(!other);
                set("class_or_year", "");
              }}
            />
          </View>
          {other ? (
            <Input
              label="Your class or year"
              value={form.class_or_year}
              onChangeText={(t) => set("class_or_year", t)}
              error={errors.class_or_year}
              placeholder="e.g. A-level, Diploma 2nd year"
              maxLength={50}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <FieldError message={errors.class_or_year} />
          )}
        </View>
      ) : null}
    </StepScroll>
  );
}

/* ---------- District ---------- */

export function DistrictStep({ form, set, errors }: StepProps) {
  const c = useColors();
  const districts = useDistricts();
  const filtered = filterDistricts(districts.data?.items ?? [], form.district);
  const typed = form.district.trim();

  return (
    <View className="flex-1 gap-4">
      <ScreenTitle title="Which district do you live in?" subtitle="Optional. Pick from the list or type it." />
      <Input
        label="District"
        value={form.district}
        onChangeText={(t) => set("district", t)}
        error={errors.district}
        placeholder="e.g. Dhaka or ঢাকা"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        maxLength={80}
      />
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.name}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={districts.isRefetching} onRefresh={() => void districts.refetch()} tintColor={c.brand500} colors={[c.brand500]} />}
        renderItem={({ item }) => {
          const on = item.name === form.district;
          return (
            <Pressable
              onPress={() => {
                set("district", item.name);
                Keyboard.dismiss();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${item.name}, ${item.bn}`}
              className={cn("min-h-12 flex-row items-center gap-3 rounded-2xl px-4 py-2.5 active:bg-muted-bg", on && "bg-brand-50")}
            >
              <View className="flex-1">
                <Text className={cn("text-[15px] leading-[22px] text-ink", on && "font-semibold")}>{item.name}</Text>
                <Caption>{item.bn}</Caption>
              </View>
              {on ? <Ionicons name="checkmark" size={20} color={c.brand500} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          districts.isLoading ? (
            <View className="gap-4 px-4 py-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-5 w-1/2" />
              ))}
            </View>
          ) : districts.isError ? (
            <View className="items-start gap-2 px-4 py-3">
              <Caption>Couldn&apos;t load the list. You can still type your district.</Caption>
              <Pressable onPress={() => districts.refetch()} accessibilityRole="button" className="min-h-12 justify-center active:opacity-60">
                <Text className="text-[15px] leading-[22px] font-semibold text-brand-700">Try again</Text>
              </Pressable>
            </View>
          ) : typed ? (
            <View className="px-4 py-3">
              <Caption>Not in our list. We&apos;ll save “{typed}” as you typed it.</Caption>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

/* ---------- Birth year ---------- */

export function BirthYearStep({ form, set, errors }: StepProps) {
  const [years] = useState(() => birthYears());
  return (
    <StepScroll>
      <ScreenTitle title="What year were you born?" subtitle="Only the year. Students under 18 get extra protections." />
      <YearWheel years={years} value={form.birth_year} initial={suggestedBirthYear(form.education_level)} onChange={(y) => set("birth_year", y)} />
      {errors.birth_year ? <FieldError message={errors.birth_year} /> : <Caption>Scroll to your year, or tap it.</Caption>}
    </StepScroll>
  );
}

/* ---------- Guardian consent (minors only) ---------- */

export function ConsentStep({ form, set, errors }: StepProps) {
  const c = useColors();
  const on = form.guardian_consent;
  return (
    <StepScroll>
      <ScreenTitle
        title="Does a parent or guardian know?"
        subtitle="You're under 18, so a parent or guardian needs to agree before you continue. Your profile stays private by default."
      />
      <PressableScale
        onPress={() => set("guardian_consent", !on)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        className={cn("flex-row items-start gap-4 rounded-2xl border-2 p-5", on ? "border-brand-500 bg-brand-50" : "border-transparent bg-card")}
      >
        <Ionicons name={on ? "checkbox" : "square-outline"} size={24} color={on ? c.brand500 : c.muted} />
        <Text className="flex-1 text-[15px] leading-[22px] text-ink">My parent or guardian knows I am using IccheGhuri and agrees.</Text>
      </PressableScale>
      <FieldError message={errors.guardian_consent} />
    </StepScroll>
  );
}

/* ---------- Language ---------- */

export function LanguageStep({ form, set }: StepProps) {
  return (
    <StepScroll>
      <ScreenTitle title="Which language do you prefer?" subtitle="You can switch any time in Profile." />
      <View className="gap-3" accessibilityRole="radiogroup">
        <OptionCard title="English" body="Explanations in English." selected={form.preferred_language === "en"} onPress={() => set("preferred_language", "en")} />
        <OptionCard title="বাংলা" eyebrow="Bangla" body="ব্যাখ্যা বাংলায়।" selected={form.preferred_language === "bn"} onPress={() => set("preferred_language", "bn")} />
      </View>
    </StepScroll>
  );
}

/* ---------- Interests ---------- */

export function InterestsStep({ form, set, errors }: StepProps) {
  const toggle = (i: string) => set("interests", form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);
  return (
    <StepScroll>
      <ScreenTitle title="What are you interested in?" subtitle="Pick a few. We use these to recommend courses and opportunities." />
      <View className="flex-row flex-wrap gap-2">
        {INTERESTS.map((i) => (
          <Chip key={i} label={i} selected={form.interests.includes(i)} onPress={() => toggle(i)} />
        ))}
      </View>
      {errors.interests ? (
        <FieldError message={errors.interests} />
      ) : form.interests.length ? (
        <Caption>{form.interests.length} selected</Caption>
      ) : null}
    </StepScroll>
  );
}

/* ---------- Goals ---------- */

export function GoalsStep({ form, set, errors }: StepProps) {
  return (
    <StepScroll>
      <ScreenTitle title="What's your goal?" subtitle="Optional. A line is enough." />
      <Input
        label="Your goal"
        value={form.goals}
        onChangeText={(t) => set("goals", t)}
        error={errors.goals}
        placeholder="e.g. Build my first AI project and join a national olympiad"
        multiline
        maxLength={1000}
        textAlignVertical="top"
        style={{ minHeight: 120 }}
        hint={`${form.goals.length}/1000`}
      />
    </StepScroll>
  );
}
