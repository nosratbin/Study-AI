import { Stack } from "expo-router";
import { useColors } from "@/theme/colors";

/** Onboarding for students who haven't finished it. One route, `index`: the stepper handles its own steps and back. */
export default function SetupLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.surface } }} />;
}
