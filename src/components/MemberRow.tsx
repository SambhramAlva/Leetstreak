import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import type { MemberWithStats } from "@/hooks/useGroup";

export function MemberRow({ member }: { member: MemberWithStats }) {
  const { colors } = useTheme();
  const name = member.display_name || member.username;

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      {member.avatar_url ? (
        <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          🔥 {member.streak?.current_streak ?? 0} day streak · {member.streak?.total_solved ?? 0} solved
        </Text>
      </View>

      <View style={styles.status}>
        <Text style={{ fontSize: 18 }}>{member.solvedToday ? "✅" : "❌"}</Text>
        {member.solvedCountToday > 1 && (
          <Text style={[styles.count, { color: colors.textMuted }]}>{member.solvedCountToday}</Text>
        )}
      </View>
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
  status: { alignItems: "center" },
  count: { fontSize: 11, marginTop: 2 },
});
