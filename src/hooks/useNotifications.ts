import { useCallback, useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_ID = "leetstreak-daily-reminder";

// Schedules (or replaces) the local daily reminder at the given time. Local
// notifications are used here on purpose: they fire reliably without any
// server involvement, so "remind me at 8pm" works even with no connectivity.
export async function scheduleDailyReminder(hour: number, minute: number) {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Keep your streak alive 🔥",
      body: "You haven't solved a LeetCode problem today yet.",
    },
    trigger: { hour, minute, repeats: true },
  });
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

// Registers this device for push (used for optional "groupmate solved POTD"
// nudges sent from the sync-leetcode Edge Function) and saves the token.
export function useRegisterPushToken(userId: string | undefined) {
  const register = useCallback(async () => {
    if (!userId) return;
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
  }, [userId]);

  useEffect(() => {
    register();
  }, [register]);

  return { register };
}
