import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

export function useProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile> => {
      if (!userId) throw new Error("No user ID provided");

      // 1. Fetch profile using maybeSingle() instead of single() so missing rows don't crash the query
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("[useProfile] Error fetching profile:", error);
      }

      if (data) return data;

      // 2. Fallback: Auto-create missing profile for logged in user if row does not exist yet
      try {
        const { data: userData } = await supabase.auth.getUser();
        const email = userData.user?.email;
        const defaultUsername = email ? email.split("@")[0] : `user_${userId.slice(0, 5)}`;

        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .upsert({ id: userId, username: defaultUsername }, { onConflict: "id" })
          .select("*")
          .single();

        if (!createError && newProfile) return newProfile;
      } catch (err) {
        console.warn("[useProfile] Auto-creation error:", err);
      }

      // 3. Ultra-resilient fallback object so profile screens never fail to load
      return {
        id: userId,
        username: "User",
        display_name: null,
        avatar_url: null,
        leetcode_username: null,
        timezone: "UTC",
        reminder_hour: 20,
        reminder_minute: 0,
        reminder_enabled: false,
        created_at: new Date().toISOString(),
      } as unknown as Profile;
    },
    enabled: !!userId,
    staleTime: 60_000,
    retry: 2,
  });

  async function updateProfile(patch: Partial<Profile>) {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  }

  return { ...query, updateProfile };
}
