import React, { useState } from "react";
import { View, Text, StyleSheet, Platform, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { Screen, LoadingState, ErrorState, Button, TextField } from "@/components/Shared";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { scheduleDailyReminder, cancelDailyReminder } from "@/hooks/useNotifications";
import { LeetCodeCard } from "@/components/LeetCodeCard";
import { useResponsive } from "@/hooks/useResponsive";

export function ProfileScreen({ userId }: { userId: string }) {
  const { colors, mode, setMode } = useTheme();
  const { isMobile } = useResponsive();
  const { signOut } = useAuth();
  const { data: profile, isLoading, isError, refetch, updateProfile } = useProfile(userId);
  const [leetcodeInput, setLeetcodeInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState />
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
  reminderDate.setHours(profile.reminder_hour, profile.reminder_minute, 0, 0);

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
    if (!leetcodeInput.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ leetcode_username: leetcodeInput.trim() });
      setLeetcodeInput("");
    } finally {
      setSaving(false);
    }
  }

  const profileHeader = (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={[styles.title, { color: colors.text }]}>{profile.display_name || profile.username}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>@{profile.username}</Text>
    </View>
  );

  const leetcodeSection = (
    <Section title="LeetCode" colors={colors}>
      <Text style={{ color: colors.textMuted, marginBottom: spacing.sm }}>
        Connected as: {profile.leetcode_username ?? "Not connected"}
      </Text>
      {profile.leetcode_username ? (
        <View style={{ marginBottom: spacing.sm }}>
          <LeetCodeCard username={profile.leetcode_username} />
        </View>
      ) : null}
      <TextField
        placeholder="Update LeetCode username"
        autoCapitalize="none"
        value={leetcodeInput}
        onChangeText={setLeetcodeInput}
      />
      <View style={{ marginTop: spacing.sm }}>
        <Button title="Save" onPress={saveLeetcodeUsername} loading={saving} />
      </View>
    </Section>
  );

  const reminderSection = (
    <Section title="Daily reminder" colors={colors}>
      <View style={styles.row}>
        <Text style={{ color: colors.text }}>
          {profile.reminder_enabled ? "On" : "Off"} · {reminderDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
                <Button title="Sign out" variant="secondary" onPress={signOut} />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {leetcodeSection}
            {reminderSection}
            {appearanceSection}
            <Button title="Sign out" variant="secondary" onPress={signOut} />
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
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 13, marginTop: 4 },
  section: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gridRow: { flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" },
  leftCol: { flex: 1.2 },
  rightCol: { flex: 1 },
});
