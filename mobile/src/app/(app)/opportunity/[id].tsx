/**
 * Opportunity detail (pushed from cards and Home). Key facts first; a sticky bottom bar with Track (sets the student's
 * own status in a sheet) and Apply (the official URL from the API, in the in-app browser). Only verified opportunities
 * reach this screen: the backend returns 404 for anything else.
 */
import { useEffect, useState } from "react";
import { Alert, RefreshControl } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ZoomIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APPLICATION_LABELS, formatDay, formatDeadline, levelLabel, type ApplicationStatus, type Opportunity } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Button, EmptyState, ErrorState, Icon, type IconName } from "@/components/ui";
import { Skeleton } from "@/components/motion";
import { AnimatedView, Pressable, ScrollView, Text, View } from "@/tw";
import { BottomSheet, ChoiceRow } from "@/components/sheet";
import { useOpportunity, usePullRefresh, useToggleSave, useTrackApplication } from "@/components/opportunities/hooks";
import { DeadlinePill, StatusPill, StepTrack } from "@/components/opportunities/parts";
import { STATUS_ORDER } from "@/components/opportunities/timeline";

const STATUS_HINTS: Record<ApplicationStatus, string> = {
  planned: "You plan to apply",
  applied: "You've sent your application",
  accepted: "You were selected",
  rejected: "You weren't selected this time",
};

function hostname(url: string): string {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].replace(/^www\./, "") : url;
}

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const query = useOpportunity(typeof id === "string" ? id : undefined);
  const o = query.data;
  const { refreshing, onRefresh } = usePullRefresh(query.refetch);
  const save = useToggleSave(o);

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: o
            ? () => (
                <Pressable
                  onPress={() => save.mutate(!o.saved)}
                  accessibilityRole="button"
                  accessibilityLabel={o.saved ? "Remove from saved" : "Save"}
                  accessibilityState={{ selected: o.saved }}
                  className="h-12 w-12 items-center justify-center rounded-full active:bg-muted-bg"
                >
                  <Icon name={o.saved ? "bookmark" : "bookmark-outline"} size={22} color={o.saved ? c.brand500 : c.ink} />
                </Pressable>
              )
            : undefined,
        }}
      />
      {o ? (
        <Detail o={o} refreshing={refreshing} onRefresh={onRefresh} />
      ) : query.error?.status === 404 ? (
        <View className="flex-1 bg-surface p-4">
          <EmptyState
            icon="eye-off-outline"
            title="This opportunity isn't available"
            body="It may have closed or be under review."
            action={<Button variant="secondary" onPress={() => router.back()}>Go back</Button>}
          />
        </View>
      ) : query.error ? (
        <View className="flex-1 bg-surface p-4">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </View>
      ) : (
        <DetailSkeleton />
      )}
    </>
  );
}

function Detail({ o, refreshing, onRefresh }: { o: Opportunity; refreshing: boolean; onRefresh: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const track = useTrackApplication(o);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cheer, setCheer] = useState(false);
  const levels = o.education_levels.length ? o.education_levels.map((l) => levelLabel(l)).join(", ") : "All levels";

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(false), 3500);
    return () => clearTimeout(t);
  }, [cheer]);

  const setStatus = (status: ApplicationStatus | null) => {
    setCheer(false);
    track.mutate(status, { onSuccess: () => status === "applied" && setCheer(true) });
  };

  async function apply() {
    // Only the official URL the API returned, and only over https (the backend enforces the same on input).
    if (!/^https:\/\//i.test(o.official_url)) {
      Alert.alert("Link unavailable", "This listing's website link can't be opened.");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(o.official_url, { toolbarColor: c.card, controlsColor: c.brand500, showTitle: true, enableBarCollapsing: true });
    } catch {
      Alert.alert("Couldn't open the website", "Check your connection and try again.");
    }
  }

  const status = o.application?.status ?? null;

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-8 pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand500} colors={[c.brand500]} />}
      >
        <View className="gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[13px] font-semibold leading-[18px] text-brand-700">{o.category_label}</Text>
            <View className="flex-row items-center gap-1 rounded-full bg-success-50 px-2 py-0.5">
              <Icon name="shield-checkmark" size={12} color={c.success} />
              <Text className="text-[13px] font-semibold leading-[18px] text-success">Verified{o.verified_at ? ` ${formatDay(o.verified_at)}` : ""}</Text>
            </View>
          </View>
          <Text className="type-display text-ink" accessibilityRole="header" selectable>
            {o.title}
          </Text>
          <Text className="text-[15px] leading-[22px] text-muted" selectable>
            {o.provider}
          </Text>
        </View>

        <View className="gap-4 rounded-2xl bg-card p-4">
          <Fact icon="calendar-outline" label="Deadline">
            {o.deadline ? (
              <View className="gap-1.5">
                <Text className="text-[15px] font-semibold leading-[22px] text-ink" selectable>
                  {formatDeadline(o.deadline)}
                </Text>
                <View className="flex-row flex-wrap items-center gap-2">
                  <DeadlinePill deadline={o.deadline} />
                  <Text className="text-[13px] leading-[18px] text-muted">Bangladesh time</Text>
                </View>
              </View>
            ) : (
              <Text className="text-[15px] leading-[22px] text-ink">Rolling or not announced</Text>
            )}
          </Fact>
          <Fact icon="school-outline" label="Who can apply">
            <Text className="text-[15px] font-semibold leading-[22px] text-ink">{levels}</Text>
            <Text className="text-[15px] leading-[22px] text-ink" selectable>
              {o.eligibility}
            </Text>
          </Fact>
          <Fact icon="globe-outline" label="Official website">
            <Text className="text-[15px] leading-[22px] text-ink" selectable>
              {hostname(o.official_url)}
            </Text>
          </Fact>
        </View>

        {status ? (
          <View className="gap-3 rounded-2xl bg-card p-4">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="type-heading text-ink" accessibilityRole="header">
                Your application
              </Text>
              <StatusPill status={status} />
            </View>
            <StepTrack status={status} />
            {o.application?.notes ? (
              <Text className="text-[15px] leading-[22px] text-muted" selectable>
                {o.application.notes}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Section title="About">
          <Text className="text-[15px] leading-[22px] text-ink" selectable>
            {o.description}
          </Text>
        </Section>

        {o.required_documents.length ? (
          <Section title="Documents you'll need">
            <View className="gap-2">
              {o.required_documents.map((d) => (
                <View key={d} className="flex-row gap-2.5">
                  <Icon name="document-text-outline" size={18} color={c.brand500} />
                  <Text className="flex-1 text-[15px] leading-[22px] text-ink">{d}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Text className="text-[13px] leading-[18px] text-muted">
          Our team checked this against the official source. Details can change, so always confirm the deadline and requirements on the official
          website. IccheGhuri never submits applications for you.
        </Text>
      </ScrollView>

      <View className="gap-2 bg-card px-4 pt-3" style={{ paddingBottom: insets.bottom + 12, boxShadow: "0 -1px 0 rgba(0,0,0,0.06)" }}>
        {cheer ? (
          <AnimatedView entering={ZoomIn.springify().damping(14)} exiting={FadeOut} className="flex-row items-center justify-center gap-2" accessibilityLiveRegion="polite">
            <Icon name="checkmark-circle" size={18} color={c.success} />
            <Text className="text-[15px] font-semibold leading-[22px] text-ink">Marked as applied. Good luck!</Text>
          </AnimatedView>
        ) : null}
        <View className="flex-row gap-3">
          <Button
            variant="secondary"
            icon={status ? "flag" : "flag-outline"}
            className="flex-1"
            onPress={() => setSheetOpen(true)}
            accessibilityLabel={status ? `Status: ${APPLICATION_LABELS[status]}. Change` : "Track this application"}
          >
            {status ? APPLICATION_LABELS[status] : "Track"}
          </Button>
          <Button icon="open-outline" className="flex-1" onPress={apply} accessibilityLabel={`${o.is_closed ? "Visit official site" : "Apply"}, opens ${hostname(o.official_url)}`}>
            {o.is_closed ? "Official site" : "Apply"}
          </Button>
        </View>
      </View>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Track your application">
        {(close) => (
          <>
            <Text className="text-[13px] leading-[18px] text-muted">A private record for you. Nothing is sent to the provider.</Text>
            <View className="gap-1">
              {STATUS_ORDER.map((s) => (
                <ChoiceRow
                  key={s}
                  label={APPLICATION_LABELS[s]}
                  hint={STATUS_HINTS[s]}
                  selected={status === s}
                  onPress={() => {
                    close();
                    if (status !== s) setStatus(s);
                  }}
                />
              ))}
              {status ? (
                <ChoiceRow
                  role="button"
                  tone="danger"
                  label="Stop tracking"
                  hint="Remove it from My applications"
                  onPress={() => {
                    close();
                    setStatus(null);
                  }}
                />
              ) : null}
            </View>
          </>
        )}
      </BottomSheet>
    </View>
  );
}

function Fact({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View className="flex-row gap-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50">
        <Icon name={icon} size={18} color={c.brand700} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-[13px] leading-[18px] text-muted">{label}</Text>
        {children}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="type-heading text-ink" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View className="flex-1 gap-6 bg-surface px-4 pt-2" accessibilityLabel="Loading opportunity" accessibilityState={{ busy: true }}>
      <View className="gap-3">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-8 w-11/12 rounded-lg" />
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </View>
      <Skeleton className="h-52 w-full rounded-2xl" />
      <View className="gap-2">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
      </View>
    </View>
  );
}
