import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { LeetCodeCard } from "@/components/LeetCodeCard";
import type { MemberWithStats } from "@/hooks/useGroup";
import { AppIcon } from "@/components/AppIcon";

export function MemberRow({ member }: { member: MemberWithStats }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const name = member.display_name || member.username;

  return (
    <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
      <Pressable
        onPress={() => member.leetcode_username && setExpanded(!expanded)}
        style={[
          styles.row,
          Platform.OS === "web" && member.leetcode_username && ({ cursor: "pointer" } as any),
        ]}
      >
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: "600" }}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.info}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            {member.leetcode_username ? (
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "500" }}>
                {expanded ? "▲ Hide stats" : "▼ Stats"}
              </Text>
            ) : null}
          </View>
          <View style={styles.subRow}><AppIcon name="flame" size={13} color={colors.primary} /><Text style={[styles.sub, { color: colors.textMuted }]}>{member.streak?.current_streak ?? 0} day streak · {member.streak?.total_solved ?? 0} solved</Text></View>
        </View>

        <View style={styles.status}>
          <AppIcon name={member.solvedToday ? "check" : "close"} size={18} color={member.solvedToday ? colors.primary : colors.danger} strokeWidth={2.5} />
          {member.solvedCountToday > 1 && (
            <Text style={[styles.count, { color: colors.textMuted }]}>{member.solvedCountToday}</Text>
          )}
        </View>
      </Pressable>

      {expanded && member.leetcode_username ? (
        <View style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.xs }}>
          <LeetCodeCard username={member.leetcode_username} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: radius.full },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 2 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  status: { alignItems: "center" },
  count: { fontSize: 11, marginTop: 2 },
});
