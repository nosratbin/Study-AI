/**
 * Circular progress without SVG (react-native-svg isn't a dependency): two half-rings rotate inside clipping halves.
 * Static (no animation); the percentage is announced by the parent's accessibility label.
 */
import type { ReactNode } from "react";
import { View } from "react-native";

export function ProgressRing({
  percent,
  size = 64,
  stroke = 6,
  color,
  track,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color: string;
  track: string;
  children?: ReactNode;
}) {
  const deg = (Math.max(0, Math.min(100, percent)) / 100) * 360;
  const half = size / 2;
  const ring = { width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: color } as const;

  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[ring, { position: "absolute", borderColor: track }]} />
      {/* Right half: shows 0°–180°. A left half-ring rotates clockwise into it. Skipped at 0 % (its anti-aliased
          edges would otherwise leave hairline ticks at 12 and 6 o'clock). */}
      {deg > 0 ? (
      <View style={{ position: "absolute", left: half, width: half, height: size, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: -half, width: size, height: size, transform: [{ rotate: `${Math.min(deg, 180)}deg` }] }}>
          <View style={{ width: half, height: size, overflow: "hidden" }}>
            <View style={ring} />
          </View>
        </View>
      </View>
      ) : null}
      {/* Left half: shows 180°–360°. A right half-ring rotates clockwise into it. */}
      {deg > 180 ? (
      <View style={{ position: "absolute", left: 0, width: half, height: size, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, width: size, height: size, transform: [{ rotate: `${deg - 180}deg` }] }}>
          <View style={{ position: "absolute", left: half, width: half, height: size, overflow: "hidden" }}>
            <View style={[ring, { marginLeft: -half }]} />
          </View>
        </View>
      </View>
      ) : null}
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}
