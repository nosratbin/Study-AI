import { ReduceMotion, ZoomIn } from "react-native-reanimated";
import { Image } from "@/tw/image";
import { AnimatedView, Text } from "@/tw";

const KITE = require("@/assets/images/splash-icon.png");

/**
 * "All done for today": the kite and one line of copy. It springs in only when the student has just ticked the last
 * task (`animate`); on a later visit it simply appears. Reduce-motion drops the spring.
 */
export function AllDone({ animate }: { animate: boolean }) {
  return (
    <AnimatedView
      entering={animate ? ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System) : undefined}
      className="flex-row items-center gap-3 rounded-2xl bg-brand-50 p-4"
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
    >
      <Image source={KITE} className="h-10 w-10" accessibilityIgnoresInvertColors />
      <Text className="flex-1 text-[15px] font-semibold leading-[22px] text-brand-700">All done for today. Your kite is flying!</Text>
    </AnimatedView>
  );
}
