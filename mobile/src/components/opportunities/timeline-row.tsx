/** Rows for the "My applications" timeline: a vertical rail with one node per opportunity, grouped by stage. */
import { cn } from "@/lib/cn";
import { Text, View } from "@/tw";
import { OpportunityCard } from "./parts";
import type { TimelineItem, TimelineKey, TimelineSection } from "./timeline";

const NODE: Record<TimelineKey, string> = {
  planned: "border-2 border-brand-500 bg-card",
  applied: "bg-brand-500",
  accepted: "bg-success",
  rejected: "bg-muted",
  saved: "border-2 border-line bg-card",
};

export function TimelineSectionHeader({ section, first }: { section: TimelineSection; first: boolean }) {
  const n = section.data.length;
  return (
    <View className={cn("flex-row items-center gap-3 pb-3", first ? "pt-2" : "pt-6")} accessibilityRole="header" accessibilityLabel={`${section.title}, ${n}`}>
      <View className="w-6 items-center">
        <View className={cn("h-3.5 w-3.5 rounded-full", NODE[section.key])} />
      </View>
      <Text className="flex-1 type-heading text-ink">{section.title}</Text>
      <Text className="text-[13px] font-semibold leading-[18px] text-muted">{n}</Text>
    </View>
  );
}

export function TimelineRow({ item, last }: { item: TimelineItem; last: boolean }) {
  return (
    <View className="flex-row gap-3">
      <View className="w-6 items-center" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View className="w-0.5 flex-1 bg-line" />
      </View>
      <View className={cn("flex-1", last ? "" : "pb-3")}>
        <OpportunityCard o={item.opportunity} />
      </View>
    </View>
  );
}
