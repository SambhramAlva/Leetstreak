import React, { useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { Screen, LoadingState, ErrorState, Button, TextField } from "@/components/Shared";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { scheduleDailyReminder, cancelDailyReminder } from "@/hooks/useNotifications";

export function ProfileScreen({ userId }: { userId: string }) {
  const { colors, mode, setMode } = useTheme();
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

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>{profile.display_name || profile.username}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>@{profile.username}</Text>

        <Section title="LeetCode" colors={colors}>
          <Text style={{ color: colors.textMuted, marginBottom: spacing.sm }}>
            Connected as: {profile.leetcode_username ?? "Not connected"}
          </Text>
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

        <Section title="Appearance" colors={colors}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
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

        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </View>
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
  sub: { fontSize: 13, marginTop: -spacing.sm },
  section: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
