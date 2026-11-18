/** Auto / English / বাংলা segmented control for the tutor's reply language. */
import { SegmentedControl } from "@/components/ui";
import type { ChatLanguage } from "@/lib/types";
import { LANGUAGES } from "./prompts";

export function LanguageSwitch({ value, onChange }: { value: ChatLanguage; onChange: (v: ChatLanguage) => void }) {
  return <SegmentedControl options={LANGUAGES} value={value} onChange={onChange} accessibilityLabel="Reply language" />;
}
