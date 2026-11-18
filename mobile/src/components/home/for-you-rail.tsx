import { FlatList } from "react-native";
import { TextAction } from "@/components/ui";
import { Skeleton } from "@/components/motion";
import { RailCard } from "@/components/learn/course-cards";
import type { CourseCard } from "@/lib/types";
import { Text, View } from "@/tw";
import { go } from "./navigation";

const CARD_WIDTH = 256;
const openCourse = (course: CourseCard) => go(`/course/${course.slug}`);

/** Horizontal rail of recommended courses (same card as the Learn tab's rails). */
export function ForYouRail({ courses }: { courses: CourseCard[] }) {
  if (!courses.length) return null;
  return (
    <View className="gap-3">
      <RailHeader />
      <FlatList
        horizontal
        data={courses}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <RailCard course={item} onPress={openCourse} width={CARD_WIDTH} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
      />
    </View>
  );
}

function RailHeader() {
  return (
    <View className="flex-row items-center justify-between px-4">
      <Text className="type-heading text-ink" accessibilityRole="header">
        For you
      </Text>
      <TextAction label="See all" accessibilityLabel="See all courses" onPress={() => go("/learn")} />
    </View>
  );
}

export function ForYouRailSkeleton() {
  return (
    <View className="gap-3">
      <View className="px-4">
        <Skeleton className="h-6 w-20 rounded-md" />
      </View>
      <View className="flex-row gap-3 overflow-hidden px-4">
        {[0, 1].map((i) => (
          <View key={i} className="gap-4 rounded-2xl bg-card p-4" style={{ width: CARD_WIDTH }}>
            <Skeleton className="h-9 w-24 rounded-lg" />
            <View className="gap-2">
              <Skeleton className="h-5 w-4/5 rounded-md" />
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-2/3 rounded-md" />
            </View>
            <Skeleton className="h-4 w-28 rounded-md" />
          </View>
        ))}
      </View>
    </View>
  );
}
