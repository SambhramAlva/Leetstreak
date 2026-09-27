import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, ScrollView } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { Screen, LoadingState, ErrorState, OfflineBanner } from "@/components/Shared";
import { StreakCard } from "@/components/StreakCard";
import { MemberRow } from "@/components/MemberRow";
import { useMyStreak, useSyncLeetCode } from "@/hooks/useStreak";
import { useGroupMembers } from "@/hooks/useGroup";
import { useProfile } from "@/hooks/useProfile";
import { LeetCodeCard } from "@/components/LeetCodeCard";
import { useResponsive } from "@/hooks/useResponsive";
import type { Group } from "@/types/database";

export function HomeScreen({ userId, group }: { userId: string; group: Group }) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const { data: profile } = useProfile(userId);
  const { data: streak, isLoading: streakLoading } = useMyStreak(userId);
  const {
    data: members,
    isLoading: membersLoading,
    isError,
    refetch,
    isFetching,
  } = useGroupMembers(group.id);
  const sync = useSyncLeetCode(userId);
  const [refreshing, setRefreshing] = useState(false);

  const me = members?.find((m) => m.id === userId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await sync.mutateAsync();
      await refetch();
    } catch {
      // Sync failing (e.g. offline, or LeetCode not connected yet) shouldn't
      // block viewing cached data — the OfflineBanner communicates it instead.
    } finally {
      setRefreshing(false);
    }
  }, [sync, refetch]);

  if (streakLoading || membersLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your streak..." />
      </Screen>
    );
  }

  if (isError && !members) {
    return (
      <Screen>
        <ErrorState message="Couldn't load your group." onRetry={refetch} />
      </Screen>
    );
  }

  // Multi-column desktop layout
  if (!isMobile) {
    return (
      <Screen>
        <OfflineBanner visible={isError && !!members} />
        <ScrollView
          contentContainerStyle={styles.desktopContainer}
          refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />}
        >
          <View style={styles.gridRow}>
            {/* Left Column: Streak & LeetCode Stats */}
            <View style={styles.leftCol}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[styles.groupName, { color: colors.textMuted }]}>{group.name}</Text>
                <Text style={[styles.heading, { color: colors.text }]}>Your streak</Text>
              </View>

              <StreakCard
                streak={streak}
                solvedToday={me?.solvedToday ?? false}
                solvedCountToday={me?.solvedCountToday ?? 0}
              />

              {profile?.leetcode_username ? (
                <View style={{ marginTop: spacing.lg }}>
                  <LeetCodeCard username={profile.leetcode_username} />
                </View>
              ) : null}
            </View>

            {/* Right Column: Group Progress */}
            <View style={styles.rightCol}>
              <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.heading, { color: colors.text, marginBottom: spacing.md }]}>
                  Group progress
                </Text>
                {members && members.length > 0 ? (
                  members.map((m) => <MemberRow key={m.id} member={m} />)
                ) : (
                  <Text style={{ color: colors.textMuted, textAlign: "center", padding: spacing.md }}>
                    No members yet.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // Single-column mobile layout
  return (
    <Screen>
      <OfflineBanner visible={isError && !!members} />
      <FlatList
        data={members ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
            <View>
              <Text style={[styles.groupName, { color: colors.textMuted }]}>{group.name}</Text>
              <Text style={[styles.heading, { color: colors.text }]}>Your streak</Text>
            </View>
            <StreakCard
              streak={streak}
              solvedToday={me?.solvedToday ?? false}
              solvedCountToday={me?.solvedCountToday ?? 0}
            />
            {profile?.leetcode_username ? (
              <LeetCodeCard username={profile.leetcode_username} />
            ) : null}
            <Text style={[styles.heading, { color: colors.text }]}>Group progress</Text>
          </View>
        }
        renderItem={({ item }) => <MemberRow member={item} />}
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: "center" }}>No members yet.</Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  groupName: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  heading: { fontSize: 20, fontWeight: "700" },
  desktopContainer: { padding: spacing.lg },
  gridRow: { flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" },
  leftCol: { flex: 1.2 },
  rightCol: { flex: 1 },
  cardBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
