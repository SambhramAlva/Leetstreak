import React from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { useLeetCodeDetails } from "@/hooks/useLeetCodeDetails";

export function LeetCodeCard({ username }: { username: string }) {
  const { colors } = useTheme();
  const { data: details, isLoading, isError } = useLeetCodeDetails(username);

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing.xs }}>
            Fetching LeetCode stats for @{username}...
          </Text>
        </View>
      </View>
    );
  }

  if (isError || !details) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.center}>
          <Text style={{ color: colors.danger, fontSize: 13, textAlign: "center" }}>
            ⚠️ Couldn't load LeetCode stats for @{username}. Please verify your username and settings.
          </Text>
        </View>
      </View>
    );
  }

  const easyPercent = details.totalEasy > 0 ? (details.easySolved / details.totalEasy) * 100 : 0;
  const mediumPercent = details.totalMedium > 0 ? (details.mediumSolved / details.totalMedium) * 100 : 0;
  const hardPercent = details.totalHard > 0 ? (details.hardSolved / details.totalHard) * 100 : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header Profile Section */}
      <View style={styles.header}>
        {details.avatar ? (
          <Image source={{ uri: details.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.border }]}>
            <Text style={[styles.avatarInitial, { color: colors.text }]}>
              {details.name ? details.name[0].toUpperCase() : username[0].toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.headerMeta}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {details.name || username}
            </Text>
            {details.ranking ? (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>🏆 #{details.ranking.toLocaleString()}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.username, { color: colors.textMuted }]}>@{username}</Text>
        </View>
      </View>

      {/* Difficulty Breakdown Section */}
      <View style={styles.breakdownContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SOLVED BREAKDOWN</Text>

        {/* Easy Bar */}
        <DifficultyBar
          label="Easy"
          solved={details.easySolved}
          total={details.totalEasy}
          percentage={easyPercent}
          barColor="#22C55E"
          colors={colors}
        />

        {/* Medium Bar */}
        <DifficultyBar
          label="Medium"
          solved={details.mediumSolved}
          total={details.totalMedium}
          percentage={mediumPercent}
          barColor="#F59E0B"
          colors={colors}
        />

        {/* Hard Bar */}
        <DifficultyBar
          label="Hard"
          solved={details.hardSolved}
          total={details.totalHard}
          percentage={hardPercent}
          barColor="#EF4444"
          colors={colors}
        />
      </View>

      {/* Footer Summary Grid */}
      <View style={[styles.footerGrid, { borderTopColor: colors.border }]}>
        <View style={styles.footerStat}>
          <Text style={[styles.footerValue, { color: colors.text }]}>{details.totalSolved}</Text>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Total Solved</Text>
        </View>

        <View style={styles.footerStat}>
          <Text style={[styles.footerValue, { color: colors.text }]}>
            {details.contributionPoint > 0 ? details.contributionPoint.toLocaleString() : details.reputation}
          </Text>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Reputation</Text>
        </View>

        {details.country ? (
          <View style={styles.footerStat}>
            <Text style={[styles.footerValue, { color: colors.text }]} numberOfLines={1}>
              {details.country}
            </Text>
            <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Country</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function DifficultyBar({
  label,
  solved,
  total,
  percentage,
  barColor,
  colors,
}: {
  label: string;
  solved: number;
  total: number;
  percentage: number;
  barColor: string;
  colors: any;
}) {
  return (
    <View style={styles.diffRow}>
      <View style={styles.diffHeader}>
        <Text style={[styles.diffLabel, { color: barColor }]}>{label}</Text>
        <Text style={[styles.diffCount, { color: colors.text }]}>
          {solved} <Text style={{ color: colors.textMuted, fontWeight: "400" }}>/ {total || 0}</Text>
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }]} />
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
  center: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerMeta: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
  },
  rankBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  rankText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "700",
  },
  username: {
    fontSize: 13,
  },
  breakdownContainer: {
    gap: spacing.xs + 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  diffRow: {
    gap: 4,
  },
  diffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diffLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  diffCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  footerGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  footerStat: {
    flex: 1,
    alignItems: "center",
  },
  footerValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  footerLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
