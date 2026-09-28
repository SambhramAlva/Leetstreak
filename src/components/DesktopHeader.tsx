import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius, fonts } from "@/theme/theme";
import type { Group } from "@/types/database";
import { AppIcon, AppIconName } from "@/components/AppIcon";

type TabName = "Home" | "Group" | "Chat" | "Profile" | "Admin";

interface DesktopHeaderProps {
  currentTab: TabName;
  onSelectTab: (tab: TabName) => void;
  group?: Group;
  groups?: Group[];
  onSelectGroup?: (group: Group) => void;
  isAdmin?: boolean;
}

const TABS: { name: TabName; label: string }[] = [
  { name: "Home", label: "Home" },
  { name: "Group", label: "Group" },
  { name: "Chat", label: "Chat" },
  { name: "Profile", label: "Profile" },
  { name: "Admin", label: "Admin" },
];

const TAB_ICONS: Record<TabName, AppIconName> = { Home: "home", Group: "group", Chat: "chat", Profile: "profile", Admin: "admin" };

export function DesktopHeader({ currentTab, onSelectTab, group, groups = [], onSelectGroup, isAdmin = false }: DesktopHeaderProps) {
  const { colors, mode, setMode } = useTheme();

  function cycleTheme() {
    if (mode === "dark") setMode("light");
    else if (mode === "light") setMode("system");
    else setMode("dark");
  }

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.headerContent}>
        {/* Brand logo & Group Badge */}
        <View style={styles.brandRow}>
          <Text style={[styles.brandLogo, { color: colors.primary }]}>LeetStreak</Text>
          {groups.length > 0 && (
            <View style={styles.groupSwitcher}>
              {groups.map((item) => {
                const isActive = item.id === group?.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onSelectGroup?.(item)}
                    style={[styles.groupBadge, { backgroundColor: isActive ? colors.primary : colors.background, borderColor: isActive ? colors.primary : colors.border }, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
                  >
                    <Text style={[styles.groupBadgeText, { color: isActive ? "#fff" : colors.textMuted }]}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Center Nav Tabs */}
        <View style={styles.tabGroup}>
          {TABS.filter((tab) => tab.name !== "Admin" || isAdmin).map((t) => {
            const isActive = currentTab === t.name;
            return (
              <Pressable
                key={t.name}
                onPress={() => onSelectTab(t.name)}
                style={[
                  styles.tabItem,
                  isActive && { borderBottomColor: colors.primary },
                  Platform.OS === "web" && ({ cursor: "pointer" } as any),
                ]}
              >
                <AppIcon name={TAB_ICONS[t.name]} size={15} color={isActive ? colors.primary : colors.textMuted} />
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
            <AppIcon name="settings" size={15} color={colors.textMuted} />
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
  groupSwitcher: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexShrink: 1 },
  brandLogo: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: fonts.display,
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
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
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
