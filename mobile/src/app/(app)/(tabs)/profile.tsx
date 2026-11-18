/**
 * Profile tab: a native grouped settings list. Account, Learning (level and language, saved to the backend),
 * Appearance (System/Light/Dark, saved on the device), About, then sign-out actions. Teachers and admins only get a
 * note that their dashboards are on the web.
 */
import { useState } from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import { api, toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LEVELS, levelLabel, type Role } from "@/lib/types";
import { useColors } from "@/theme/colors";
import { ErrorState, Icon, Screen } from "@/components/ui";
import { Text, View } from "@/tw";
import { BottomSheet, ChoiceRow } from "@/components/sheet";
import { usePullRefresh } from "@/components/opportunities/hooks";
import { useStudentProfile, useUpdateProfile } from "@/components/profile/hooks";
import { Avatar, SettingsGroup, SettingsRow } from "@/components/profile/rows";
import { LANGUAGE_OPTIONS, THEME_OPTIONS } from "@/components/profile/settings";
import { setThemePreference, useThemePreference } from "@/components/profile/theme";

const ROLE_LABEL: Record<Role, string> = { student: "Student", teacher: "Teacher", admin: "Admin" };
const VERSION = Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? null;

export default function ProfileScreen() {
  const c = useColors();
  const { user, logout, reload } = useAuth();
  const isStudent = user?.role === "student";
  const profile = useStudentProfile(isStudent);
  const update = useUpdateProfile();
  const theme = useThemePreference();
  const [sheet, setSheet] = useState<null | "language" | "level">(null);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const { refreshing, onRefresh } = usePullRefresh(() => Promise.all([reload(), isStudent ? profile.refetch() : null]));

  if (!user) return null;
  const p = profile.data;
  const language = LANGUAGE_OPTIONS.find((l) => l.value === p?.preferred_language)?.label;

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You'll need to sign in again on this phone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void logout() },
    ]);

  const confirmSignOutAll = () =>
    Alert.alert("Sign out of all devices?", "This ends every session on every phone and computer, including this one.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out everywhere",
        style: "destructive",
        onPress: async () => {
          setSigningOutAll(true);
          try {
            await api("/auth/logout-all", { method: "POST" });
          } catch (e) {
            setSigningOutAll(false);
            Alert.alert("Couldn't sign out everywhere", toApiError(e).message);
            return;
          }
          await logout();
        },
      },
    ]);

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing} contentClassName="gap-6 pb-12">
      <View className="items-center gap-3 pt-4">
        <Avatar name={user.full_name} url={user.avatar_url} />
        <View className="items-center gap-1">
          <Text className="type-title text-center text-ink" accessibilityRole="header">
            {user.full_name}
          </Text>
          <Text className="type-callout text-center text-muted" selectable>
            {user.email}
          </Text>
        </View>
        {isStudent && p?.education_level ? (
          <View className="rounded-md bg-brand-50 px-2 py-0.5">
            <Text className="type-caption font-semibold text-brand-700">{levelLabel(p.education_level)} level</Text>
          </View>
        ) : !isStudent ? (
          <View className="rounded-md bg-muted-bg px-2 py-0.5">
            <Text className="type-caption font-semibold text-ink">{ROLE_LABEL[user.role]}</Text>
          </View>
        ) : null}
      </View>

      {!isStudent ? (
        <View className="flex-row gap-3 rounded-2xl bg-card p-4" accessible>
          <Icon name="desktop-outline" size={22} color={c.brand500} />
          <View className="flex-1 gap-1">
            <Text className="type-heading text-ink">Your dashboard is on the web</Text>
            <Text className="text-[15px] leading-[22px] text-muted">
              {user.role === "admin" ? "Admin tools" : "Teacher tools"} like course editing, reviews and reports live on the IccheGhuri website. Sign in there
              on a computer with this account.
            </Text>
          </View>
        </View>
      ) : null}

      <SettingsGroup title="Account" footer={p?.is_minor ? "Under-18 safeguards are active on your account." : undefined}>
        <SettingsRow icon="person-outline" label="Name" value={user.full_name} />
        <SettingsRow icon="mail-outline" label="Email" value={user.email} />
        {isStudent ? (
          <SettingsRow
            icon="school-outline"
            label="Education level"
            value={p?.education_level ? levelLabel(p.education_level) : null}
            busy={profile.isPending || (update.isPending && update.variables?.education_level !== undefined)}
            chevron
            onPress={p ? () => setSheet("level") : undefined}
            accessibilityHint="Changes your courses and the AI Tutor's style"
          />
        ) : null}
        {isStudent && p?.institution ? <SettingsRow icon="business-outline" label="Institution" value={p.institution} /> : null}
      </SettingsGroup>

      {isStudent && profile.error && !p ? <ErrorState error={profile.error} onRetry={() => profile.refetch()} /> : null}

      {isStudent ? (
        <SettingsGroup title="Learning" footer="Used for lessons and AI Tutor replies.">
          <SettingsRow
            icon="language-outline"
            label="Preferred language"
            value={language}
            busy={profile.isPending || (update.isPending && update.variables?.preferred_language !== undefined)}
            chevron
            onPress={p ? () => setSheet("language") : undefined}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title="Appearance">
        {THEME_OPTIONS.map((o) => (
          <SettingsRow
            key={o.value}
            role="radio"
            icon={o.value === "system" ? "phone-portrait-outline" : o.value === "light" ? "sunny-outline" : "moon-outline"}
            label={o.label}
            checked={theme === o.value}
            onPress={() => setThemePreference(o.value)}
            accessibilityHint={o.hint}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="About">
        <SettingsRow icon="information-circle-outline" label="Version" value={VERSION} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon="log-out-outline" label="Sign out" tone="danger" onPress={confirmSignOut} />
        <SettingsRow icon="phone-portrait-outline" label="Sign out of all devices" tone="danger" busy={signingOutAll} onPress={confirmSignOutAll} />
      </SettingsGroup>

      <BottomSheet visible={sheet === "language"} onClose={() => setSheet(null)} title="Preferred language">
        {(close) => (
          <View className="gap-1">
            {LANGUAGE_OPTIONS.map((o) => (
              <ChoiceRow
                key={o.value}
                label={o.label}
                hint={o.hint}
                selected={p?.preferred_language === o.value}
                onPress={() => {
                  close();
                  if (p?.preferred_language !== o.value) update.mutate({ preferred_language: o.value });
                }}
              />
            ))}
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={sheet === "level"} onClose={() => setSheet(null)} title="Education level">
        {(close) => (
          <>
            <Text className="text-[13px] leading-[18px] text-muted">Changes your recommended courses and how the AI Tutor explains things.</Text>
            <View className="gap-1">
              {LEVELS.map((l) => (
                <ChoiceRow
                  key={l.value}
                  label={`${l.label} · ${l.tag}`}
                  hint={l.blurb}
                  selected={p?.education_level === l.value}
                  onPress={() => {
                    close();
                    if (p?.education_level !== l.value) update.mutate({ education_level: l.value });
                  }}
                />
              ))}
            </View>
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}
