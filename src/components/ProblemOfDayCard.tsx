import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import type { ProblemOfTheDay } from "@/types/database";

export function ProblemOfDayCard({
  potd,
  solvedCount,
  memberCount,
  onPropose,
}: {
  potd: ProblemOfTheDay | null;
  solvedCount: number;
  memberCount: number;
  onPropose: () => void;
}) {
  const { colors } = useTheme();

  if (!potd) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No Problem of the Day picked yet.
        </Text>
        <Pressable
          onPress={onPropose}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonText}>Propose one</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => Linking.openURL(potd.url)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Text style={[styles.eyebrow, { color: colors.primary }]}>PROBLEM OF THE DAY</Text>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {potd.title}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {solvedCount}/{memberCount} solved · tap to open on LeetCode
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: "700" },
  meta: { fontSize: 12 },
  emptyText: { fontSize: 14 },
  button: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
