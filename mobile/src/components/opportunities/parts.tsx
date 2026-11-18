/** Building blocks for the Opportunities tab and detail: card, deadline pill, chips, search, segments, skeletons. */
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { APPLICATION_LABELS, type ApplicationStatus, type Opportunity } from "@/lib/types";
import { Icon, type IconName, SegmentedControl } from "@/components/ui";
import { PressableScale, Skeleton } from "@/components/motion";
import { Pressable, Text, TextInput, View } from "@/tw";
import { deadlineCountdown } from "./deadline";
import { MAX_QUERY_LENGTH } from "./filters";
import { statusStep } from "./timeline";

export function openOpportunity(id: string) {
  router.push({ pathname: "/opportunity/[id]", params: { id } });
}

/** "5 days left" pill; orange inside 7 days, muted when closed or undated. Read aloud as "Closes in 5 days". */
export function DeadlinePill({ deadline, now }: { deadline: string | null; now?: number }) {
  const c = useColors();
  const cd = deadlineCountdown(deadline, now);
  const tone = cd.urgent ? "bg-brand-50" : "bg-muted-bg";
  const fg = cd.urgent ? "text-brand-700" : cd.state === "open" ? "text-ink" : "text-muted";
  const icon: IconName = cd.state === "closed" ? "lock-closed-outline" : cd.state === "none" ? "infinite-outline" : "time-outline";
  return (
    <View className={cn("flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1", tone)} accessible accessibilityLabel={cd.spoken}>
      <Icon name={icon} size={14} color={cd.urgent ? c.brand700 : c.muted} />
      <Text className={cn("text-[13px] font-semibold leading-[18px]", fg)}>{cd.short}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: ApplicationStatus }) {
  const done = status === "accepted";
  return (
    <View className={cn("self-start rounded-full px-2.5 py-1", done ? "bg-success-50" : "bg-muted-bg")}>
      <Text className={cn("text-[13px] font-semibold leading-[18px]", done ? "text-success" : "text-ink")}>{APPLICATION_LABELS[status]}</Text>
    </View>
  );
}

/** List card: category, title, provider, deadline countdown, and the student's status or match reasons. */
export function OpportunityCard({ o, reasons }: { o: Opportunity; reasons?: string[] }) {
  const c = useColors();
  const cd = deadlineCountdown(o.deadline);
  const label = [o.title, o.provider, o.category_label, cd.spoken, o.application ? `Your status: ${APPLICATION_LABELS[o.application.status]}` : null, o.saved ? "Saved" : null]
    .filter(Boolean)
    .join(". ");
  return (
    <PressableScale onPress={() => openOpportunity(o.id)} accessibilityLabel={label} accessibilityHint="Opens details" className="gap-3 rounded-2xl bg-card p-4">
      <View className="flex-row items-center gap-2">
        <Text className="type-label flex-1 text-muted" numberOfLines={1}>
          {o.category_label}
        </Text>
        {o.saved ? <Icon name="bookmark" size={16} color={c.brand500} /> : null}
      </View>
      <View className="gap-1">
        <Text className="type-heading text-ink" numberOfLines={3}>
          {o.title}
        </Text>
        <Text className="text-[13px] leading-[18px] text-muted" numberOfLines={1}>
          {o.provider}
        </Text>
      </View>
      {reasons?.length ? (
        <View className="gap-1">
          {reasons.slice(0, 2).map((r) => (
            <View key={r} className="flex-row gap-2">
              <Icon name="sparkles-outline" size={14} color={c.brand500} />
              <Text className="flex-1 text-[13px] leading-[18px] text-muted">{r}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View className="flex-row flex-wrap items-center gap-2">
        <DeadlinePill deadline={o.deadline} />
        {o.application ? <StatusPill status={o.application.status} /> : null}
      </View>
    </PressableScale>
  );
}

export function CardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3" accessibilityLabel="Loading opportunities" accessibilityState={{ busy: true }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="gap-3 rounded-2xl bg-card p-4">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-5 w-11/12 rounded-md" />
          <Skeleton className="h-3.5 w-1/2 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </View>
      ))}
    </View>
  );
}

/** Horizontal-rail chip: 36dp visual, 48dp touch target via hitSlop. */
export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn("h-9 justify-center rounded-full px-4", selected ? "bg-ink" : "bg-card active:bg-muted-bg")}
    >
      <Text className={cn("type-label", selected ? "text-surface" : "text-ink")}>{label}</Text>
    </Pressable>
  );
}

export function SearchField({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const c = useColors();
  return (
    <View className="h-12 flex-1 flex-row items-center gap-2 rounded-xl bg-card pl-4">
      <Icon name="search" size={18} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search scholarships, olympiads…"
        placeholderTextColor={c.subtle}
        maxLength={MAX_QUERY_LENGTH}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search opportunities"
        className="h-12 flex-1 text-[15px] text-ink"
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} accessibilityRole="button" accessibilityLabel="Clear search" className="h-12 w-12 items-center justify-center">
          <Icon name="close-circle" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Segmented control (shared BeUI-style control with a sliding indicator). */
export function Segments<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return <SegmentedControl options={options} value={value} onChange={onChange} accessibilityLabel="Opportunity views" />;
}

/** Icon-only 48dp button with a count badge (filter button). */
export function IconButton({ icon, label, onPress, badge, className }: { icon: IconName; label: string; onPress: () => void; badge?: number; className?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={cn("h-12 w-12 items-center justify-center rounded-xl bg-card active:bg-muted-bg", className)}>
      <Icon name={icon} size={20} color={badge ? c.brand500 : c.ink} />
      {badge ? (
        <View className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-brand-solid px-1">
          <Text className="text-[10px] font-semibold text-white">{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const STEPS = ["Planned", "Applied", "Result"] as const;

/** Planned → Applied → Result track for a tracked application. */
export function StepTrack({ status }: { status: ApplicationStatus }) {
  const step = statusStep(status);
  const result = status === "accepted" ? "Accepted" : status === "rejected" ? "Not selected" : "Result";
  return (
    <View className="flex-row items-center" accessible accessibilityLabel={`Step ${step + 1} of 3: ${APPLICATION_LABELS[status]}`}>
      {STEPS.map((s, i) => {
        const reached = i <= step;
        const tone = i === 2 && status === "accepted" ? "bg-success" : i === 2 && status === "rejected" ? "bg-muted" : reached ? "bg-brand-500" : "bg-line";
        return (
          <View key={s} className={cn("gap-1.5", i < 2 ? "flex-1" : "")}>
            <View className="flex-row items-center">
              <View className={cn("h-3 w-3 rounded-full", tone)} />
              {i < 2 ? <View className={cn("mx-1 h-0.5 flex-1 rounded-full", i < step ? "bg-brand-500" : "bg-line")} /> : null}
            </View>
            <Text className={cn("text-[13px] leading-[18px]", reached ? "font-semibold text-ink" : "text-muted")}>{i === 2 ? result : s}</Text>
          </View>
        );
      })}
    </View>
  );
}
