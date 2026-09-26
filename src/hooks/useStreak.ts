import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Streak } from "@/types/database";

export function useMyStreak(userId: string | undefined) {
  return useQuery({
    queryKey: ["streak", userId],
    queryFn: async (): Promise<Streak | null> => {
      const { data, error } = await supabase.from("streaks").select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Calls the sync-leetcode-self Edge Function so a fresh solve shows up almost
// immediately, instead of waiting for the next cron run (every ~15 min).
export function useSyncLeetCode(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-leetcode-self");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streak", userId] });
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
      queryClient.invalidateQueries({ queryKey: ["potd"] });
    },
  });
}

export function useConnectLeetCode(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leetcodeUsername: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ leetcode_username: leetcodeUsername.trim() })
        .eq("id", userId!);
      if (error) throw error;
      // Kick off an immediate sync so the connect screen doesn't feel dead.
      await supabase.functions.invoke("sync-leetcode-self");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["streak", userId] });
    },
  });
}
