import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import type { Streak } from "@/types/database";
import { AppIcon } from "@/components/AppIcon";

export function StreakCard({
  streak,
  solvedToday,
  solvedCountToday,
}: {
  streak: Streak | null | undefined;
  solvedToday: boolean;
  solvedCountToday: number;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: colors.text }]}>{streak?.current_streak ?? 0}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Current streak</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.value, { color: colors.text }]}>{streak?.longest_streak ?? 0}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Longest streak</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.value, { color: colors.text }]}>{streak?.total_solved ?? 0}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Total solved</Text>
        </View>
      </View>

      <View
        style={[
          styles.todayBadge,
          {
            backgroundColor: solvedToday ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.10)",
            borderColor: solvedToday ? colors.primary : colors.danger,
          },
        ]}
      >
        <AppIcon name={solvedToday ? "check" : "close"} size={18} color={solvedToday ? colors.primary : colors.danger} strokeWidth={2.5} />
        <Text style={[styles.todayText, { color: solvedToday ? colors.primary : colors.danger }]}>
          {solvedToday
            ? `Solved today${solvedCountToday > 1 ? ` · ${solvedCountToday} problems` : ""}`
            : "Not solved today yet"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center" },
  value: { fontSize: 24, fontWeight: "700" },
  label: { fontSize: 12, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 36 },
  todayBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  todayText: { fontWeight: "600", fontSize: 14 },
});
