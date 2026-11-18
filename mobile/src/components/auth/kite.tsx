/** The IccheGhuri kite mark (the splash artwork), decorative unless given a label. */
import { Image } from "@/tw/image";

const KITE = require("../../../assets/images/splash-icon.png");

export function Kite({ size = 120, label }: { size?: number; label?: string }) {
  return (
    <Image
      source={KITE}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
    />
  );
}
