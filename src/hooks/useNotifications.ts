import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

let Notifications: typeof import("expo-notifications") | null = null;
if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const DAILY_REMINDER_ID = "leetstreak-daily-reminder";

export async function scheduleDailyReminder(hour: number, minute: number) {
  if (Platform.OS === "web" || !Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Keep your streak alive",
      body: "You haven't solved a LeetCode problem today yet.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as import("expo-notifications").NotificationTriggerInput,
  });
}

export async function cancelDailyReminder() {
  if (Platform.OS === "web" || !Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

export function useRegisterPushToken(userId: string | undefined) {
  const register = useCallback(async () => {
    if (!userId || Platform.OS === "web" || !Notifications) return;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      const token = tokenResponse.data;

      await supabase
        .from("push_tokens")
        .upsert({ user_id: userId, expo_push_token: token }, { onConflict: "user_id,expo_push_token" });
    } catch {
      // Ignore notification setup failures on unsupported environments
    }
  }, [userId]);

  useEffect(() => {
    register();
  }, [register]);

  return { register };
}
