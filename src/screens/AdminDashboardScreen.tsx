import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/theme";
import { ErrorState, LoadingState, Screen } from "@/components/Shared";
import { useGroupMembers } from "@/hooks/useGroup";
import type { Group } from "@/types/database";

export function AdminDashboardScreen({ group }: { group: Group }) {
  const { colors } = useTheme();
  const { data: members, isLoading, isError, refetch, isFetching } = useGroupMembers(group.id);

  if (isLoading) {
    return <Screen><LoadingState label="Loading dashboard..." /></Screen>;
  }

  if (isError || !members) {
    return <Screen><ErrorState message="Couldn't load the admin dashboard." onRetry={refetch} /></Screen>;
  }

  const activeToday = members.filter((member) => member.solvedToday).length;
  const totalSolved = members.reduce((total, member) => total + (member.streak?.total_solved ?? 0), 0);
  const averageStreak = members.length
    ? Math.round(members.reduce((total, member) => total + (member.streak?.current_streak ?? 0), 0) / members.length)
    : 0;
  const connected = members.filter((member) => member.leetcode_username).length;
  const sortedMembers = [...members].sort(
    (a, b) => (b.streak?.current_streak ?? 0) - (a.streak?.current_streak ?? 0),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>GROUP ADMIN</Text>
            <Text style={[styles.title, { color: colors.text }]}>Command center</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{group.name} · invite {group.invite_code}</Text>
          </View>
          <Pressable
            onPress={() => refetch()}
            style={[styles.refreshButton, { borderColor: colors.border, backgroundColor: colors.surface }, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>{isFetching ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <Metric label="Members" value={members.length} detail={`${connected} connected`} colors={colors} />
          <Metric label="Active today" value={activeToday} detail={`${members.length ? Math.round((activeToday / members.length) * 100) : 0}% participation`} colors={colors} />
          <Metric label="Problems solved" value={totalSolved} detail="Across this group" colors={colors} />
          <Metric label="Avg. streak" value={`${averageStreak}d`} detail="Current member average" colors={colors} />
        </View>

        <View style={styles.columns}>
          <View style={[styles.panel, styles.rosterPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={[styles.panelTitle, { color: colors.text }]}>Member health</Text>
                <Text style={[styles.panelHint, { color: colors.textMuted }]}>Sorted by current streak</Text>
              </View>
              <Text style={[styles.panelAction, { color: colors.primary }]}>{activeToday}/{members.length} today</Text>
            </View>
            {sortedMembers.map((member) => {
              const name = member.display_name || member.username;
              return (
                <View key={member.id} style={[styles.memberRow, { borderTopColor: colors.border }]}>
                  <View style={[styles.avatar, { backgroundColor: member.solvedToday ? colors.primary : colors.border }]}>
                    <Text style={{ color: member.solvedToday ? "#fff" : colors.text, fontWeight: "800" }}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{name}</Text>
                    <Text style={[styles.memberMeta, { color: colors.textMuted }]}>{member.leetcode_username ? `@${member.leetcode_username}` : "LeetCode not connected"}</Text>
                  </View>
                  <View style={styles.memberStats}>
                    <Text style={[styles.streak, { color: colors.text }]}>🔥 {member.streak?.current_streak ?? 0}</Text>
                    <Text style={[styles.memberMeta, { color: member.solvedToday ? colors.primary : colors.textMuted }]}>{member.solvedToday ? "Active" : "Needs a solve"}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.sideColumn}>
            <View style={[styles.panel, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={styles.inviteEyebrow}>GROW THE GROUP</Text>
              <Text style={styles.inviteTitle}>Bring in your next solver</Text>
              <Text style={styles.inviteCopy}>Share this invite code with teammates ready to build a streak.</Text>
              <View style={styles.codeBox}><Text style={[styles.code, { color: colors.text }]}>{group.invite_code}</Text></View>
            </View>
            <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Admin checklist</Text>
              <ChecklistItem text="Keep the daily streak visible" done={activeToday > 0} colors={colors} />
              <ChecklistItem text="Connect every member to LeetCode" done={connected === members.length && members.length > 0} colors={colors} />
              <ChecklistItem text="Celebrate a new personal best" done={members.some((member) => (member.streak?.longest_streak ?? 0) >= 7)} colors={colors} />
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value, detail, colors }: { label: string; value: string | number; detail: string; colors: any }) {
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricDetail, { color: colors.primary }]}>{detail}</Text>
    </View>
  );
}

function ChecklistItem({ text, done, colors }: { text: string; done: boolean; colors: any }) {
  return <View style={styles.checkItem}><Text style={{ color: done ? colors.primary : colors.textMuted, fontSize: 16 }}>{done ? "✓" : "○"}</Text><Text style={[styles.checkText, { color: colors.text }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: spacing.xs },
  title: { fontSize: 30, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: spacing.xs },
  refreshButton: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metric: { flex: 1, minWidth: 150, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  metricLabel: { fontSize: 12, fontWeight: "600" },
  metricValue: { fontSize: 27, fontWeight: "800" },
  metricDetail: { fontSize: 12, fontWeight: "700" },
  columns: { flexDirection: "row", alignItems: "flex-start", gap: spacing.lg },
  rosterPanel: { flex: 1.5 },
  sideColumn: { flex: 1, gap: spacing.lg },
  panel: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  panelTitle: { fontSize: 17, fontWeight: "800" },
  panelHint: { fontSize: 12, marginTop: 3 },
  panelAction: { fontSize: 12, fontWeight: "800" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm + 2 },
  avatar: { width: 36, height: 36, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "700" },
  memberMeta: { fontSize: 11, marginTop: 2 },
  memberStats: { alignItems: "flex-end" },
  streak: { fontSize: 14, fontWeight: "800" },
  inviteEyebrow: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  inviteTitle: { color: "#fff", fontSize: 21, fontWeight: "800", marginTop: spacing.sm },
  inviteCopy: { color: "rgba(255,255,255,0.86)", lineHeight: 19, marginTop: spacing.sm },
  codeBox: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radius.sm, padding: spacing.sm, alignItems: "center", marginTop: spacing.md },
  code: { fontSize: 20, fontWeight: "900", letterSpacing: 2 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  checkText: { flex: 1, fontSize: 13, lineHeight: 18 },
});