import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius, fonts } from "@/theme/theme";
import { Screen, LoadingState, ErrorState, Button, TextField } from "@/components/Shared";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { scheduleDailyReminder, cancelDailyReminder } from "@/hooks/useNotifications";
import { LeetCodeCard } from "@/components/LeetCodeCard";
import { useResponsive } from "@/hooks/useResponsive";
import { useAlert } from "@/context/AlertContext";
import { AppIcon } from "@/components/AppIcon";
import { supabase } from "@/lib/supabase";

export function ProfileScreen({ userId }: { userId: string }) {
  const { colors, mode, setMode } = useTheme();
  const { isMobile } = useResponsive();
  const { signOut } = useAuth();
  const { showAlert } = useAlert();
  const { data: profile, isLoading, isError, refetch, updateProfile } = useProfile(userId);
  const [leetcodeInput, setLeetcodeInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signInEmail, setSignInEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignInEmail(data?.user?.email ?? null);
    });
  }, []);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading profile..." />
      </Screen>
    );
  }
  if (isError || !profile) {
    return (
      <Screen>
        <ErrorState message="Couldn't load your profile." onRetry={refetch} />
      </Screen>
    );
  }

  const reminderDate = new Date();
  reminderDate.setHours(
    profile.reminder_hour ?? 20,
    profile.reminder_minute ?? 0,
    0,
    0
  );

  async function onTimeChange(hour: number, minute: number) {
    setSaving(true);
    try {
      await updateProfile({ reminder_hour: hour, reminder_minute: minute });
      if (profile!.reminder_enabled) await scheduleDailyReminder(hour, minute);
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminder(enabled: boolean) {
    setSaving(true);
    try {
      await updateProfile({ reminder_enabled: enabled });
      if (enabled) await scheduleDailyReminder(profile!.reminder_hour, profile!.reminder_minute);
      else await cancelDailyReminder();
    } finally {
      setSaving(false);
    }
  }

  async function saveLeetcodeUsername() {
    const trimmed = leetcodeInput.trim();
    if (!trimmed) return;

    // Warn if LeetCode username looks like an email (common mistake)
    if (trimmed.includes("@")) {
      showAlert({
        type: "warning",
        title: "That looks like an email",
        message: "LeetCode usernames don't contain '@'. Enter your LeetCode username (not email), e.g. john_doe123.",
      });
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ leetcode_username: trimmed });
      setLeetcodeInput("");
      showAlert({
        type: "success",
        title: "LeetCode username updated",
        message: `Now tracking as "${trimmed}". Your streak will sync in the background.`,
      });
    } catch (e: any) {
      showAlert({
        type: "error",
        title: "Couldn't save",
        message: e?.message ?? "Something went wrong saving your LeetCode username.",
      });
    } finally {
      setSaving(false);
    }
  }

  function confirmSignOut() {
    showAlert({
      type: "warning",
      title: "Sign out?",
      message: "You'll need to sign in again to access your streak.",
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: signOut },
      ],
    });
  }

  const profileHeader = (
    <View style={styles.profileHeaderCard}>
      {/* Avatar placeholder */}
      <View style={[styles.avatar, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
        <Text style={[styles.avatarLetter, { color: colors.primary }]}>
          {(profile.display_name || profile.username || "U")[0].toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>{profile.display_name || profile.username}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>@{profile.username}</Text>
        {/* Signed-in email chip */}
        {signInEmail && (
          <View style={[styles.emailChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <AppIcon name="activity" size={11} color={colors.textMuted} />
            <Text style={[styles.emailChipText, { color: colors.textMuted }]} numberOfLines={1}>
              {signInEmail}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const leetcodeSection = (
    <Section title="LeetCode" colors={colors}>
      {/* Current connection status */}
      <View style={[styles.connectionStatus, {
        backgroundColor: profile.leetcode_username ? colors.success + "15" : colors.background,
        borderColor: profile.leetcode_username ? colors.success + "40" : colors.border,
      }]}>
        <AppIcon
          name={profile.leetcode_username ? "check" : "link"}
          size={14}
          color={profile.leetcode_username ? colors.success : colors.textMuted}
        />
        <Text style={{ color: profile.leetcode_username ? colors.success : colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          {profile.leetcode_username ? `Connected as ${profile.leetcode_username}` : "Not connected yet"}
        </Text>
      </View>

      {/* Email match notice */}
      {signInEmail && (
        <View style={[styles.infoBanner, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <AppIcon name="activity" size={12} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Signed in with <Text style={{ fontWeight: "700", color: colors.text }}>{signInEmail}</Text>
          </Text>
        </View>
      )}

      {profile.leetcode_username ? (
        <View style={{ marginBottom: spacing.sm }}>
          <LeetCodeCard username={profile.leetcode_username} />
        </View>
      ) : null}

      <TextField
        placeholder={profile.leetcode_username ? "Change LeetCode username" : "Your LeetCode username"}
        autoCapitalize="none"
        value={leetcodeInput}
        onChangeText={setLeetcodeInput}
      />
      <View style={{ marginTop: spacing.sm }}>
        <Button title={profile.leetcode_username ? "Update username" : "Connect"} onPress={saveLeetcodeUsername} loading={saving} />
      </View>
    </Section>
  );

  const reminderSection = (
    <Section title="Daily reminder" colors={colors}>
      <View style={styles.row}>
        <Text style={{ color: colors.text }}>
          {profile.reminder_enabled ? "On" : "Off"} ·{" "}
          {reminderDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </Text>
        <Button
          title={profile.reminder_enabled ? "Turn off" : "Turn on"}
          variant="secondary"
          onPress={() => toggleReminder(!profile.reminder_enabled)}
        />
      </View>
      {profile.reminder_enabled && (
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Change time" variant="secondary" onPress={() => setShowPicker(true)} />
          {showPicker && (
            <DateTimePicker
              value={reminderDate}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowPicker(Platform.OS === "ios");
                if (date) onTimeChange(date.getHours(), date.getMinutes());
              }}
            />
          )}
        </View>
      )}
    </Section>
  );

  const appearanceSection = (
    <Section title="Appearance" colors={colors}>
      <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
        {(["light", "dark", "system"] as const).map((m) => (
          <Button
            key={m}
            title={m[0].toUpperCase() + m.slice(1)}
            variant={mode === m ? "primary" : "secondary"}
            onPress={() => setMode(m)}
          />
        ))}
      </View>
    </Section>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {profileHeader}
        {!isMobile ? (
          <View style={styles.gridRow}>
            <View style={styles.leftCol}>{leetcodeSection}</View>
            <View style={styles.rightCol}>
              {reminderSection}
              {appearanceSection}
              <View style={{ marginTop: spacing.md }}>
                <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {leetcodeSection}
            {reminderSection}
            {appearanceSection}
            <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  profileHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { fontSize: 22, fontWeight: "700", fontFamily: fonts.display },
  title: { fontSize: 20, fontWeight: "700", fontFamily: fonts.display },
  sub: { fontSize: 13, marginTop: 2 },
  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  emailChipText: { fontSize: 11, fontWeight: "500" },
  section: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gridRow: { flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" },
  leftCol: { flex: 1.2 },
  rightCol: { flex: 1 },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoText: { fontSize: 12, flex: 1, lineHeight: 16 },
});
