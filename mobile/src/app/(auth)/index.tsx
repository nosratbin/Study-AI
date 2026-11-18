/**
 * Welcome: the first screen a signed-out student sees. The kite, one promise, and two ways in, both in the thumb zone.
 */
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Easing, FadeIn, FadeInDown, ReduceMotion } from "react-native-reanimated";
import { Button } from "@/components/ui";
import { GoogleButton } from "@/components/auth/google-button";
import { Kite } from "@/components/auth/kite";
import { useColors } from "@/theme/colors";
import { AnimatedView, ScrollView, Text, View } from "@/tw";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function Welcome() {
  const c = useColors();
  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView className="flex-1" contentContainerClassName="grow justify-between gap-10 px-6 pt-10 pb-4">
        <View className="flex-1 items-center justify-center gap-8">
          {/* First open only, so the kite gets a short rise; reduce-motion keeps the fade and drops the travel. */}
          <AnimatedView entering={FadeInDown.duration(500).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}>
            <Kite size={128} />
          </AnimatedView>
          <AnimatedView entering={FadeIn.delay(120).duration(400).reduceMotion(ReduceMotion.System)} className="items-center gap-3">
            <Text className="type-heading text-brand-700">IccheGhuri</Text>
            <Text className="type-display text-center text-ink" accessibilityRole="header">
              Learn AI at your level
            </Text>
            <Text className="type-body max-w-sm text-center text-muted">
              Lessons, a tutor that answers in Bangla or English, and verified scholarships, from Class 6 to university.
            </Text>
          </AnimatedView>
        </View>
        <View className="gap-3">
          <GoogleButton />
          <Button onPress={() => router.push("/register")}>Create account</Button>
          <Button variant="secondary" onPress={() => router.push("/login")}>
            I have an account
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
