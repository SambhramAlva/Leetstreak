import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Group, Profile, Streak } from "@/types/database";

// LeetStreak keeps things simple: one active group per user (matches the
// "Home | Group | Chat | Profile" nav — no group switcher needed). Users can
// still leave and join a different group from Profile.

export type MemberWithStats = Profile & {
  streak: Streak | null;
  solvedToday: boolean;
  solvedCountToday: number;
};

function todayRangeUTC() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useMyGroup(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-group", userId],
    queryFn: async (): Promise<Group | null> => {
      const { data: membership, error: memErr } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId!)
        .limit(1)
        .maybeSingle();
      if (memErr) throw memErr;
      if (!membership) return null;

      const { data: group, error: groupErr } = await supabase
        .from("groups")
        .select("*")
        .eq("id", membership.group_id)
        .single();
      if (groupErr) throw groupErr;
      return group;
    },
    enabled: !!userId,
  });
}

function generateInviteCode(): string {
  const words = ["FOX", "OWL", "ELM", "SKY", "OAK", "RAY", "JET", "IVY"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${word}-${num}`;
}

export function useGroupActions(userId: string | undefined) {
  const queryClient = useQueryClient();

  async function createGroup(name: string): Promise<Group> {
    if (!userId) throw new Error("Not signed in");
    const invite_code = generateInviteCode();
    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name, invite_code, created_by: userId })
      .select()
      .single();
    if (error) throw error;

    const { error: memberErr } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: userId, role: "owner" });
    if (memberErr) throw memberErr;

    queryClient.invalidateQueries({ queryKey: ["my-group", userId] });
    return group;
  }

  async function joinGroup(code: string): Promise<Group> {
    const { data, error } = await supabase.rpc("join_group_by_code", { code: code.trim().toUpperCase() });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["my-group", userId] });
    return data as unknown as Group;
  }

  return { createGroup, joinGroup };
}

export function useGroupMembers(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async (): Promise<MemberWithStats[]> => {
      const { data: members, error } = await supabase
        .from("group_members")
        .select("user_id, profiles(*)")
        .eq("group_id", groupId!);
      if (error) throw error;

      const userIds = (members ?? []).map((m: any) => m.user_id);
      if (userIds.length === 0) return [];

      const { data: streaks } = await supabase.from("streaks").select("*").in("user_id", userIds);
      const streakMap = new Map((streaks ?? []).map((s) => [s.user_id, s as Streak]));

      const { start, end } = todayRangeUTC();
      const { data: todaySolves } = await supabase
        .from("leetcode_solves")
        .select("user_id")
        .in("user_id", userIds)
        .gte("solved_at", start)
        .lt("solved_at", end);
      const todayCounts = new Map<string, number>();
      for (const row of todaySolves ?? []) {
        todayCounts.set(row.user_id, (todayCounts.get(row.user_id) ?? 0) + 1);
      }

      return (members ?? []).map((m: any) => {
        const profile = m.profiles as Profile;
        const count = todayCounts.get(m.user_id) ?? 0;
        return {
          ...profile,
          streak: streakMap.get(m.user_id) ?? null,
          solvedToday: count > 0,
          solvedCountToday: count,
        };
      });
    },
    enabled: !!groupId,
  });

  // Unique per mounted instance: two screens watching the same group (e.g.
  // Home + Group tabs, both kept mounted by React Navigation) must not share
  // a realtime channel topic, or the second subscribe() call throws.
  const instanceId = useId();

  // Live-ish updates: refresh member stats when any solve/streak changes.
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-stats-${groupId}-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "streaks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return query;
}
