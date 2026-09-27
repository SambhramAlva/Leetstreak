import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useMyGroups } from "@/hooks/useGroup";
import { Screen, LoadingState, ErrorState } from "@/components/Shared";
import { AuthScreen } from "@/screens/AuthScreen";
import { GroupOnboardingScreen } from "@/screens/GroupOnboardingScreen";
import { ConnectLeetCodeScreen } from "@/screens/ConnectLeetCodeScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { GroupScreen } from "@/screens/GroupScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { AdminDashboardScreen } from "@/screens/AdminDashboardScreen";
import { useProfile } from "@/hooks/useProfile";
import { useRegisterPushToken } from "@/hooks/useNotifications";
import type { Group } from "@/types/database";

import { useResponsive } from "@/hooks/useResponsive";
import { DesktopHeader } from "@/components/DesktopHeader";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Group: "👥",
  Chat: "💬",
  Profile: "🙂",
  Admin: "⚙️",
};

function MainTabs({ userId, group, groups, onGroupChange }: { userId: string; group: Group; groups: Group[]; onGroupChange: (group: Group) => void }) {
  const { colors } = useTheme();
  const { showDesktopNav } = useResponsive();
  useRegisterPushToken(userId);

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: showDesktopNav,
        header: () => (
          <DesktopHeader
            currentTab={route.name as any}
            onSelectTab={(tab) => navigation.navigate(tab)}
            group={group}
            groups={groups}
            onSelectGroup={onGroupChange}
            isAdmin={group.created_by === userId}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          display: showDesktopNav ? "none" : "flex",
          ...(Platform.OS === "web" && {
            maxWidth: 720,
            width: "100%",
            alignSelf: "center",
          }),
        },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home">{() => <HomeScreen userId={userId} group={group} />}</Tab.Screen>
      <Tab.Screen name="Group">{() => <GroupScreen userId={userId} group={group} groups={groups} onSelectGroup={onGroupChange} />}</Tab.Screen>
      <Tab.Screen name="Chat">{() => <ChatScreen userId={userId} group={group} />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <ProfileScreen userId={userId} />}</Tab.Screen>
      {group.created_by === userId ? (
        <Tab.Screen name="Admin">{() => <AdminDashboardScreen group={group} />}</Tab.Screen>
      ) : null}
    </Tab.Navigator>
  );
}

function AuthenticatedApp({ userId }: { userId: string }) {
  const { data: groups, isLoading, isError, refetch } = useMyGroups(userId);
  const { data: profile } = useProfile(userId);
  const [skippedConnect, setSkippedConnect] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGroupId && groups?.[0]) setSelectedGroupId(groups[0].id);
    if (selectedGroupId && groups && !groups.some((item) => item.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]?.id ?? null);
    }
  }, [groups, selectedGroupId]);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading..." />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message="Couldn't load your group." onRetry={refetch} />
      </Screen>
    );
  }
  if (!groups?.length) {
    return <GroupOnboardingScreen userId={userId} />;
  }
  if (!profile?.leetcode_username && !skippedConnect) {
    return <ConnectLeetCodeScreen userId={userId} onDone={() => setSkippedConnect(true)} />;
  }

  const group = groups.find((item) => item.id === selectedGroupId) ?? groups[0];
  return <MainTabs userId={userId} group={group} groups={groups} onGroupChange={(nextGroup) => setSelectedGroupId(nextGroup.id)} />;
}

export function RootNavigator() {
  const { session, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <Screen>
        <LoadingState label="Loading LeetStreak..." />
      </Screen>
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      {session ? <AuthenticatedApp userId={session.user.id} /> : <AuthScreen />}
    </NavigationContainer>
  );
}
