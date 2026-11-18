/** JS copies of the CSS tokens in src/global.css, for props that can't take a className (icon colors, tab bar, spinners). */
import { useColorScheme } from "react-native";

export const light = {
  brand50: "#FFF4EB",
  brand100: "#FFE6D2",
  brand200: "#FFD0AA",
  brand500: "#F97316",
  brand600: "#EA580C",
  brand700: "#C2410C",
  ink: "#111110",
  subtle: "#8C8C87",
  muted: "#5F5F5B",
  surface: "#F5F5F4",
  card: "#FFFFFF",
  mutedBg: "#EDEDEB",
  line: "#E7E7E4",
  input: "#D6D6D2",
  success: "#15803D",
  success50: "#ECFDF3",
  danger: "#DC2626",
  danger50: "#FEF2F2",
  brandSolid: "#C2410C",
  successSolid: "#15803D",
  dangerSolid: "#B91C1C",
};

export type Palette = typeof light;

export const dark: Palette = {
  brand50: "#2A1A0E",
  brand100: "#3B2210",
  brand200: "#5A3314",
  brand500: "#F97316",
  brand600: "#EA580C",
  brand700: "#FDBA74",
  ink: "#F2F2F1",
  subtle: "#6F6F6C",
  muted: "#A3A3A0",
  surface: "#0E0E0E",
  card: "#1A1A19",
  mutedBg: "#242423",
  line: "#2A2A29",
  input: "#3A3A38",
  success: "#4ADE80",
  success50: "#0F2A1A",
  danger: "#F87171",
  danger50: "#2C1215",
  brandSolid: "#C2410C",
  successSolid: "#15803D",
  dangerSolid: "#B91C1C",
};

export function useColors(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
