/**
 * Opportunities tab: Explore (search, category chips, filter sheet), For you (rule-based matches) and My applications
 * (timeline). Students only: the backend serves verified opportunities only, and the UI never adds any of its own.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FlatList, RefreshControl, ScrollView as RNScrollView, SectionList, Switch, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useAuth } from "@/lib/auth";
import { CATEGORY_OPTIONS, LEVELS, type EducationLevel, type Opportunity, type OpportunityCategory, type OpportunityMatch } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { Button, EmptyState, ErrorState, Icon, Screen } from "@/components/ui";
import { Pressable, Text, View } from "@/tw";
import { BottomSheet, ChoiceRow } from "@/components/sheet";
import { buildOpportunityQuery, sheetFilterCount, type OpportunityFilters } from "@/components/opportunities/filters";
import { useApplications, useOpportunityList, useOpportunityMatches, usePullRefresh, useSavedOpportunities } from "@/components/opportunities/hooks";
import { CardSkeletons, FilterChip, IconButton, OpportunityCard, SearchField, Segments } from "@/components/opportunities/parts";
import { TimelineRow, TimelineSectionHeader } from "@/components/opportunities/timeline-row";
import { buildTimeline, type TimelineItem, type TimelineSection } from "@/components/opportunities/timeline";

type Segment = "explore" | "match" | "mine";
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "explore", label: "Explore" },
  { value: "match", label: "For you" },
  { value: "mine", label: "My applications" },
];

/**
 * Explore's search and filters live in the screen, above the segment switch, so leaving Explore and coming back keeps
 * them. Only the active list is mounted (cheaper on low-end phones); each list's scroll offset is kept below.
 */
function useExploreState() {
  const [text, setText] = useState("");
  const [q, setQ] = useState(""); // debounced copy of `text`, so typing doesn't fire a request per key
  const [category, setCategory] = useState<OpportunityCategory | null>(null);
  const [level, setLevel] = useState<EducationLevel | null>(null);
  const [includeClosed, setIncludeClosed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(text), 350);
    return () => clearTimeout(t);
  }, [text]);

  const clearAll = () => {
    setText("");
    setQ("");
    setCategory(null);
    setLevel(null);
    setIncludeClosed(false);
  };

  const filters: OpportunityFilters = { q, category, level, includeClosed };
  return { text, setText, filters, setCategory, setLevel, setIncludeClosed, clearAll };
}

type ExploreState = ReturnType<typeof useExploreState>;
/** Scroll offset per segment, kept outside React so it survives a list unmounting. */
const savedOffsets: Record<Segment, number> = { explore: 0, match: 0, mine: 0 };

type Scrollable = { getScrollResponder: () => unknown };
type ScrollResponder = { scrollTo?: (o: { y: number; animated: boolean }) => void } | null | undefined;

/** Remember a list's scroll offset across unmounts and restore it once, when its (cached) content has laid out. */
function useKeptScroll(list: RefObject<Scrollable | null>, segment: Segment) {
  const restored = useRef(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    savedOffsets[segment] = e.nativeEvent.contentOffset.y;
  };
  const onContentSizeChange = (_w: number, h: number) => {
    const y = savedOffsets[segment];
    if (restored.current || !y || h <= y) return;
    restored.current = true;
    (list.current?.getScrollResponder() as ScrollResponder)?.scrollTo?.({ y, animated: false });
  };
  return [onScroll, onContentSizeChange] as const;
}

export default function OpportunitiesScreen() {
  const { user } = useAuth();
  const [segment, setSegment] = useState<Segment>("explore");
  const explore = useExploreState();

  if (user && user.role !== "student") {
    return (
      <Screen>
        <LargeTitle />
        <EmptyState icon="trophy-outline" title="For students" body="The Opportunity Hub is for student accounts. Staff manage opportunities from the web dashboard." />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View className="gap-4 px-4 pb-3 pt-2">
        <LargeTitle />
        <Segments value={segment} options={SEGMENTS} onChange={setSegment} />
      </View>
      {segment === "explore" ? (
        <ExploreList state={explore} />
      ) : segment === "match" ? (
        <MatchList onBrowse={() => setSegment("explore")} />
      ) : (
        <MineList onBrowse={() => setSegment("explore")} />
      )}
    </Screen>
  );
}

function LargeTitle() {
  return (
    <Text className="type-display text-ink" accessibilityRole="header">
      Opportunities
    </Text>
  );
}

const LIST_PADDING = { paddingHorizontal: 16, paddingBottom: 32 } as const;
const Gap = () => <View className="h-3" />;

function useRefreshControl(refetch: () => Promise<unknown>) {
  const c = useColors();
  const { refreshing, onRefresh } = usePullRefresh(refetch);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand500} colors={[c.brand500]} />;
}

/* ---------- Explore ---------- */

function ExploreList({ state }: { state: ExploreState }) {
  const c = useColors();
  const { text, setText, filters, setCategory, setLevel, setIncludeClosed, clearAll } = state;
  const { category, level, includeClosed } = filters;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState({ level, includeClosed });
  const listRef = useRef<FlatList<Opportunity>>(null);
  const [onScroll, onContentSizeChange] = useKeptScroll(listRef, "explore");

  const qs = buildOpportunityQuery(filters);
  const query = useOpportunityList(qs);
  const refreshControl = useRefreshControl(query.refetch);
  const badge = sheetFilterCount(filters);

  const header = (
    <View className="gap-3 pb-3">
      <View className="flex-row gap-2">
        <SearchField value={text} onChangeText={setText} />
        <IconButton
          icon="options-outline"
          label={badge ? `Filters, ${badge} active` : "Filters"}
          badge={badge}
          onPress={() => {
            setDraft({ level, includeClosed });
            setSheetOpen(true);
          }}
        />
      </View>
      <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }} style={{ marginHorizontal: -16 }}>
        <View className="w-2" />
        <FilterChip label="All" selected={!category} onPress={() => setCategory(null)} />
        {CATEGORY_OPTIONS.map((o) => (
          <FilterChip key={o.value} label={o.label} selected={category === o.value} onPress={() => setCategory(category === o.value ? null : o.value)} />
        ))}
        <View className="w-2" />
      </RNScrollView>
      <View className="flex-row items-center gap-2">
        <Icon name="shield-checkmark-outline" size={16} color={c.success} />
        <Text className="flex-1 text-[13px] leading-[18px] text-muted">Every listing is checked against its official source.</Text>
      </View>
    </View>
  );

  return (
    <>
      <FlatList
        ref={listRef}
        onScroll={onScroll}
        scrollEventThrottle={64}
        onContentSizeChange={onContentSizeChange}
        data={query.data ?? []}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <OpportunityCard o={item} />}
        ItemSeparatorComponent={Gap}
        ListHeaderComponent={header}
        ListEmptyComponent={
          query.isPending ? (
            <CardSkeletons />
          ) : query.error && !query.data ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : qs ? (
            <EmptyState icon="search-outline" title="Nothing matches these filters" body="Try a different search or category." action={<Button variant="secondary" onPress={clearAll}>Clear filters</Button>} />
          ) : (
            <EmptyState icon="trophy-outline" title="No verified opportunities yet" body="Our team adds opportunities only after checking the official source. Check back soon." />
          )
        }
        refreshControl={refreshControl}
        contentContainerStyle={LIST_PADDING}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={(close) => (
          <>
            <Button variant="secondary" className="flex-1" onPress={() => setDraft({ level: null, includeClosed: false })}>
              Reset
            </Button>
            <Button
              className="flex-1"
              onPress={() => {
                setLevel(draft.level);
                setIncludeClosed(draft.includeClosed);
                close();
              }}
            >
              Show results
            </Button>
          </>
        )}
      >
        <View className="gap-1">
          <Text className="pb-1 text-[13px] font-semibold leading-[18px] text-muted" accessibilityRole="header">
            Education level
          </Text>
          <ChoiceRow label="All levels" selected={!draft.level} onPress={() => setDraft((d) => ({ ...d, level: null }))} />
          {LEVELS.map((l) => (
            <ChoiceRow key={l.value} label={l.label} hint={l.tag} selected={draft.level === l.value} onPress={() => setDraft((d) => ({ ...d, level: l.value }))} />
          ))}
        </View>
        <Pressable
          onPress={() => setDraft((d) => ({ ...d, includeClosed: !d.includeClosed }))}
          accessibilityRole="switch"
          accessibilityState={{ checked: draft.includeClosed }}
          accessibilityLabel="Show closed opportunities"
          accessibilityHint="Include ones whose deadline has passed"
          className="min-h-14 flex-row items-center gap-3 rounded-2xl px-4 py-2 active:bg-muted-bg"
        >
          <View className="flex-1 gap-0.5">
            <Text className="text-[15px] font-semibold leading-[22px] text-ink">Show closed opportunities</Text>
            <Text className="text-[13px] leading-[18px] text-muted">Include ones whose deadline has passed</Text>
          </View>
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Switch
              value={draft.includeClosed}
              onValueChange={(v) => setDraft((d) => ({ ...d, includeClosed: v }))}
              trackColor={{ true: c.brand500, false: c.line }}
              thumbColor="#fff"
            />
          </View>
        </Pressable>
      </BottomSheet>
    </>
  );
}

/* ---------- For you ---------- */

function MatchList({ onBrowse }: { onBrowse: () => void }) {
  const query = useOpportunityMatches();
  const refreshControl = useRefreshControl(query.refetch);
  const listRef = useRef<FlatList<OpportunityMatch>>(null);
  const [onScroll, onContentSizeChange] = useKeptScroll(listRef, "match");
  return (
    <FlatList
      ref={listRef}
      onScroll={onScroll}
      scrollEventThrottle={64}
      onContentSizeChange={onContentSizeChange}
      data={query.data ?? []}
      keyExtractor={(m) => m.opportunity.id}
      renderItem={({ item }) => <OpportunityCard o={item.opportunity} reasons={item.reasons} />}
      ItemSeparatorComponent={Gap}
      ListHeaderComponent={
        query.data?.length ? <Text className="pb-3 text-[13px] leading-[18px] text-muted">Ranked by your education level, interests and assessment results.</Text> : undefined
      }
      ListEmptyComponent={
        query.isPending ? (
          <CardSkeletons />
        ) : query.error && !query.data ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <EmptyState
            icon="sparkles-outline"
            title="No open matches right now"
            body="New opportunities appear as our team verifies them."
            action={<Button variant="secondary" onPress={onBrowse}>Explore all opportunities</Button>}
          />
        )
      }
      refreshControl={refreshControl}
      contentContainerStyle={LIST_PADDING}
    />
  );
}

/* ---------- My applications ---------- */

function MineList({ onBrowse }: { onBrowse: () => void }) {
  const apps = useApplications();
  const saved = useSavedOpportunities();
  const refreshControl = useRefreshControl(() => Promise.all([apps.refetch(), saved.refetch()]));
  const sections = useMemo(() => buildTimeline(apps.data ?? [], saved.data ?? []), [apps.data, saved.data]);
  const error = (apps.error && !apps.data) || (saved.error && !saved.data) ? (apps.error ?? saved.error) : null;

  const listRef = useRef<SectionList<TimelineItem, TimelineSection>>(null);
  const [onScroll, onContentSizeChange] = useKeptScroll(listRef, "mine");

  return (
    <SectionList<TimelineItem, TimelineSection>
      ref={listRef}
      onScroll={onScroll}
      scrollEventThrottle={64}
      onContentSizeChange={onContentSizeChange}
      sections={sections}
      keyExtractor={(i) => i.opportunity.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => <TimelineSectionHeader section={section} first={section.key === sections[0]?.key} />}
      renderItem={({ item, index, section }) => <TimelineRow item={item} last={index === section.data.length - 1} />}
      ListHeaderComponent={
        sections.length ? <Text className="pb-1 text-[13px] leading-[18px] text-muted">A private record for you. Nothing is sent to the provider.</Text> : undefined
      }
      ListEmptyComponent={
        apps.isPending || saved.isPending ? (
          <CardSkeletons count={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => Promise.all([apps.refetch(), saved.refetch()])} />
        ) : (
          <EmptyState
            icon="git-commit-outline"
            title="No applications tracked yet"
            body="Open an opportunity and tap Track to keep a timeline of where you've applied."
            action={<Button variant="secondary" onPress={onBrowse}>Explore opportunities</Button>}
          />
        )
      }
      refreshControl={refreshControl}
      contentContainerStyle={LIST_PADDING}
    />
  );
}
