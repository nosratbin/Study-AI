/** Native grouped-settings building blocks for the Profile tab. */
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { cn } from "@/lib/cn";
import { useColors } from "@/theme/colors";
import { Icon, type IconName } from "@/components/ui";
import { Image } from "@/tw/image";
import { Pressable, Text, View } from "@/tw";
import { initials } from "./settings";

export function Avatar({ name, url, size = 72 }: { name: string; url: string | null; size?: number }) {
  if (url && /^https:\/\//i.test(url)) {
    return (
      <Image
        source={{ uri: url }}
        cachePolicy="memory-disk"
        transition={150}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    );
  }
  return (
    <View className="items-center justify-center rounded-full bg-brand-100" style={{ width: size, height: size }} accessible={false}>
      <Text className="text-brand-700" style={{ fontSize: size * 0.36, lineHeight: size * 0.44, fontWeight: "700" }}>{initials(name)}</Text>
    </View>
  );
}

/** A titled group of rows on a soft card, with inset hairlines between rows. */
export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View className="gap-2">
      {title ? (
        <Text className="type-label px-4 text-muted" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-2xl bg-card">
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View className="ml-[60px] h-px bg-line" /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text className="px-4 text-[13px] leading-[18px] text-muted">{footer}</Text> : null}
    </View>
  );
}

/**
 * One settings row: tinted icon, label, optional value, chevron (when it opens something) or check (when it's a
 * selected option). 56dp tall; grows with font scaling.
 */
export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  chevron,
  checked,
  tone = "default",
  busy,
  accessibilityHint,
  role,
}: {
  icon: IconName;
  label: string;
  value?: string | null;
  onPress?: () => void;
  chevron?: boolean;
  checked?: boolean;
  tone?: "default" | "danger";
  busy?: boolean;
  accessibilityHint?: string;
  role?: "button" | "radio";
}) {
  const c = useColors();
  const danger = tone === "danger";
  const body = (
    <>
      <View className={cn("h-8 w-8 items-center justify-center rounded-lg", danger ? "bg-danger-50" : "bg-muted-bg")}>
        <Icon name={icon} size={17} color={danger ? c.danger : c.ink} />
      </View>
      <Text className={cn("type-body flex-1", danger ? "font-semibold text-danger" : "text-ink")}>{label}</Text>
      {value ? (
        <Text className="type-callout max-w-[55%] text-right text-muted" numberOfLines={2} selectable={!onPress}>
          {value}
        </Text>
      ) : null}
      {busy ? <ActivityIndicator color={c.brand500} /> : null}
      {checked ? <Icon name="checkmark" size={20} color={c.brand700} /> : null}
      {chevron && !busy ? <Icon name="chevron-forward" size={18} color={c.subtle} /> : null}
    </>
  );
  const cls = "min-h-13 flex-row items-center gap-3 px-4 py-2.5";
  if (!onPress) {
    return (
      <View className={cls} accessible accessibilityLabel={value ? `${label}: ${value}` : label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole={role ?? "button"}
      accessibilityLabel={value ? `${label}: ${value}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={role === "radio" ? { checked: !!checked, selected: !!checked, busy: !!busy } : { busy: !!busy }}
      className={cn(cls, "active:bg-muted-bg")}
    >
      {body}
    </Pressable>
  );
}
