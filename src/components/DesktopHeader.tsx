import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import type { Group } from "@/types/database";

type TabName = "Home" | "Group" | "Chat" | "Profile";

interface DesktopHeaderProps {
  currentTab: TabName;
  onSelectTab: (tab: TabName) => void;
  group?: Group;
}

const TABS: { name: TabName; label: string; icon: string }[] = [
  { name: "Home", label: "Home", icon: "🏠" },
  { name: "Group", label: "Group", icon: "👥" },
  { name: "Chat", label: "Chat", icon: "💬" },
  { name: "Profile", label: "Profile", icon: "🙂" },
];

export function DesktopHeader({ currentTab, onSelectTab, group }: DesktopHeaderProps) {
  const { colors, mode, setMode } = useTheme();

  function cycleTheme() {
    if (mode === "dark") setMode("light");
    else if (mode === "light") setMode("system");
    else setMode("dark");
  }

  const themeIcon = mode === "dark" ? "🌙" : mode === "light" ? "☀️" : "💻";

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.headerContent}>
        {/* Brand logo & Group Badge */}
        <View style={styles.brandRow}>
          <Text style={[styles.brandLogo, { color: colors.primary }]}>🔥 LeetStreak</Text>
          {group && (
            <View style={[styles.groupBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.groupBadgeText, { color: colors.textMuted }]}>👥 {group.name}</Text>
            </View>
          )}
        </View>

        {/* Center Nav Tabs */}
        <View style={styles.tabGroup}>
          {TABS.map((t) => {
            const isActive = currentTab === t.name;
            return (
              <Pressable
                key={t.name}
                onPress={() => onSelectTab(t.name)}
                style={[
                  styles.tabItem,
                  isActive && { backgroundColor: colors.background, borderColor: colors.border },
                  Platform.OS === "web" && ({ cursor: "pointer" } as any),
                ]}
              >
                <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.primary : colors.textMuted, fontWeight: isActive ? "700" : "500" },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Right Action: Theme toggle */}
        <View style={styles.rightActions}>
          <Pressable
            onPress={cycleTheme}
            style={[
              styles.themeBtn,
              { backgroundColor: colors.background, borderColor: colors.border },
              Platform.OS === "web" && ({ cursor: "pointer" } as any),
            ]}
          >
            <Text style={{ fontSize: 14 }}>{themeIcon}</Text>
            <Text style={[styles.themeBtnText, { color: colors.textMuted }]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    borderBottomWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    zIndex: 100,
  },
  headerContent: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  brandLogo: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  groupBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "transparent",
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabLabel: {
    fontSize: 14,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  themeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
