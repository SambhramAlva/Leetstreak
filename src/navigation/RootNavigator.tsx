import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";
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
import { useIsAdmin } from "@/hooks/useAdmin";
import { useRegisterPushToken } from "@/hooks/useNotifications";
import type { Group } from "@/types/database";

import { useResponsive } from "@/hooks/useResponsive";
import { DesktopHeader } from "@/components/DesktopHeader";
import { AppIcon, AppIconName } from "@/components/AppIcon";
import { fonts } from "@/theme/theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, AppIconName> = {
  Home: "home",
  Group: "group",
  Chat: "chat",
  Profile: "profile",
  Admin: "admin",
};

function MainTabs({ userId, group, groups, onGroupChange, isAdmin }: { userId: string; group: Group; groups: Group[]; onGroupChange: (group: Group) => void; isAdmin: boolean }) {
  const { colors } = useTheme();
  const { showDesktopNav } = useResponsive();
  useRegisterPushToken(userId);

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarPosition: "bottom",
        headerShown: showDesktopNav,
        header: () => (
          <DesktopHeader
            currentTab={route.name as any}
            onSelectTab={(tab) => navigation.navigate(tab)}
            group={group}
            groups={groups}
            onSelectGroup={onGroupChange}
            isAdmin={isAdmin}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 11, fontWeight: "600" },
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
        tabBarIcon: ({ color, focused }) => <AppIcon name={TAB_ICONS[route.name]} size={19} color={color} strokeWidth={focused ? 2.5 : 2} />,
      })}
    >
      <Tab.Screen name="Home">{() => <HomeScreen userId={userId} group={group} />}</Tab.Screen>
      <Tab.Screen name="Group">{() => <GroupScreen userId={userId} group={group} groups={groups} onSelectGroup={onGroupChange} />}</Tab.Screen>
      <Tab.Screen name="Chat">{() => <ChatScreen userId={userId} group={group} />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <ProfileScreen userId={userId} />}</Tab.Screen>
      {isAdmin ? (
        <Tab.Screen name="Admin">{() => <AdminDashboardScreen />}</Tab.Screen>
      ) : null}
    </Tab.Navigator>
  );
}

function AuthenticatedApp({ userId }: { userId: string }) {
  const { data: groups, isLoading, isError, refetch } = useMyGroups(userId);
  const { data: profile } = useProfile(userId);
  const { data: isAdmin } = useIsAdmin(userId);
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
    return isAdmin ? <AdminDashboardScreen /> : <GroupOnboardingScreen userId={userId} />;
  }
  if (!isAdmin && !profile?.leetcode_username && !skippedConnect) {
    return <ConnectLeetCodeScreen userId={userId} onDone={() => setSkippedConnect(true)} />;
  }

  const group = groups.find((item) => item.id === selectedGroupId) ?? groups[0];
  return <MainTabs userId={userId} group={group} groups={groups} isAdmin={isAdmin === true} onGroupChange={(nextGroup) => setSelectedGroupId(nextGroup.id)} />;
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
