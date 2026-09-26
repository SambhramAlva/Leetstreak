import React, { useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useMyGroup } from "@/hooks/useGroup";
import { Screen, LoadingState, ErrorState } from "@/components/Shared";
import { AuthScreen } from "@/screens/AuthScreen";
import { GroupOnboardingScreen } from "@/screens/GroupOnboardingScreen";
import { ConnectLeetCodeScreen } from "@/screens/ConnectLeetCodeScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { GroupScreen } from "@/screens/GroupScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { useProfile } from "@/hooks/useProfile";
import { useRegisterPushToken } from "@/hooks/useNotifications";
import type { Group } from "@/types/database";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Group: "👥",
  Chat: "💬",
  Profile: "🙂",
};

function MainTabs({ userId, group }: { userId: string; group: Group }) {
  const { colors } = useTheme();
  useRegisterPushToken(userId);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home">{() => <HomeScreen userId={userId} group={group} />}</Tab.Screen>
      <Tab.Screen name="Group">{() => <GroupScreen userId={userId} group={group} />}</Tab.Screen>
      <Tab.Screen name="Chat">{() => <ChatScreen userId={userId} group={group} />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <ProfileScreen userId={userId} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

function AuthenticatedApp({ userId }: { userId: string }) {
  const { data: group, isLoading, isError, refetch } = useMyGroup(userId);
  const { data: profile } = useProfile(userId);
  const [skippedConnect, setSkippedConnect] = useState(false);

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
  if (!group) {
    return <GroupOnboardingScreen userId={userId} />;
  }
  if (!profile?.leetcode_username && !skippedConnect) {
    return <ConnectLeetCodeScreen userId={userId} onDone={() => setSkippedConnect(true)} />;
  }

  return <MainTabs userId={userId} group={group} />;
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
