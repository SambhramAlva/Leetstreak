import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DiscoverableGroup, Group, Profile, Streak } from "@/types/database";

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

export function useMyGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-groups", userId],
    queryFn: async (): Promise<Group[]> => {
      const { data: membership, error: memErr } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId!)
        .order("joined_at", { ascending: true });
      if (memErr) throw memErr;
      const groupIds = (membership ?? []).map((row) => row.group_id);
      if (groupIds.length === 0) return [];

      const { data: groups, error: groupErr } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);
      if (groupErr) throw groupErr;
      const { data: groupMembers, error: memberErr } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);
      if (memberErr) throw memberErr;
      const memberCounts = new Map<string, number>();
      for (const row of groupMembers ?? []) memberCounts.set(row.group_id, (memberCounts.get(row.group_id) ?? 0) + 1);
      const order = new Map(groupIds.map((id, index) => [id, index]));
      return (groups ?? []).map((group) => ({ ...group, member_count: memberCounts.get(group.id) ?? 0 })).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    },
    enabled: !!userId,
  });
}

export function useMyGroup(userId: string | undefined) {
  const query = useMyGroups(userId);
  return { ...query, data: query.data?.[0] ?? null };
}

export function useDiscoverableGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ["discoverable-groups", userId],
    queryFn: async (): Promise<DiscoverableGroup[]> => {
      const { data, error } = await supabase.rpc("discover_groups");
      if (error) throw error;
      return (data ?? []) as DiscoverableGroup[];
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

  async function ensureProfile(id: string) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", id).maybeSingle();
    if (!profile) {
      const { data: userResp } = await supabase.auth.getUser();
      const user = userResp?.user;
      const fallbackUsername =
        user?.user_metadata?.username ||
        user?.email?.split("@")[0] ||
        `user_${id.slice(0, 8)}`;
      await supabase.from("profiles").upsert({ id, username: fallbackUsername }, { onConflict: "id" });
    }
  }

  async function createGroup(name: string): Promise<Group> {
    if (!userId) throw new Error("Not signed in");
    await ensureProfile(userId);

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

    queryClient.invalidateQueries({ queryKey: ["my-groups", userId] });
    return group;
  }

  async function joinGroup(code: string): Promise<Group> {
    if (!userId) throw new Error("Not signed in");
    await ensureProfile(userId);

    const { data, error } = await supabase.rpc("join_group_by_code", { code: code.trim().toUpperCase() });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["my-groups", userId] });
    return data as unknown as Group;
  }

  async function joinGroupById(groupId: string): Promise<Group> {
    if (!userId) throw new Error("Not signed in");
    await ensureProfile(userId);

    const { data, error } = await supabase.rpc("join_group_by_id", { target_group_id: groupId });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["my-groups", userId] });
    queryClient.invalidateQueries({ queryKey: ["discoverable-groups", userId] });
    return data as unknown as Group;
  }

  return { createGroup, joinGroup, joinGroupById };
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
