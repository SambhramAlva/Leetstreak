/// <reference types="https://deno.land/x/deno/cli/tsc/dts/lib.deno.ns.d.ts" />
// Supabase Edge Function: sync-leetcode-self
//
// Called directly from the app (Home screen focus / pull-to-refresh) so a user
// sees their own new solve reflected within seconds, instead of waiting for the
// next cron tick. Authenticates the caller via their JWT, then syncs only their
// own LeetCode data. Same logic as sync-leetcode, scoped to one user.
//
// Deploy: supabase functions deploy sync-leetcode-self
// Call from the app: supabase.functions.invoke('sync-leetcode-self')

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEETCODE_GQL = "https://leetcode.com/graphql";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fetchRecentSolves(username: string) {
  try {
    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp }
      }
    `;
    const res = await fetch(LEETCODE_GQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({ query, variables: { username, limit: 40 } }),
    });
    if (res.ok) {
      const json = await res.json();
      const list = json?.data?.recentAcSubmissionList;
      if (Array.isArray(list)) return list;
    }
  } catch {
    // Fallback to Alfa API below
  }

  try {
    const alfaRes = await fetch(`https://alfa-leetcode-api.onrender.com/recentAc/${username}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (alfaRes.ok) {
      const data = await alfaRes.json();
      return Array.isArray(data) ? data : data?.recentAcSubmissionList ?? [];
    }
  } catch {
    // ignore
  }

  return [];
}

async function fetchTotalSolved(username: string): Promise<number> {
  try {
    const query = `
      query userProblemsSolved($username: String!) {
        matchedUser(username: $username) { submitStatsGlobal { acSubmissionNum { difficulty count } } }
      }
    `;
    const res = await fetch(LEETCODE_GQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({ query, variables: { username } }),
    });
    if (res.ok) {
      const json = await res.json();
      const stats = json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
      const count = stats.find((s: { difficulty: string }) => s.difficulty === "All")?.count;
      if (typeof count === "number") return count;
    }
  } catch {
    // Fallback to Alfa API below
  }

  try {
    const alfaRes = await fetch(`https://alfa-leetcode-api.onrender.com/userProfile/${username}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (alfaRes.ok) {
      const data = await alfaRes.json();
      if (typeof data?.totalSolved === "number") return data.totalSolved;
    }
  } catch {
    // ignore
  }

  return 0;
}

function computeStreak(solvedDates: string[]) {
  if (solvedDates.length === 0) return { current: 0, longest: 0, last: null as string | null };
  const days = [...new Set(solvedDates)].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const daySet = new Set(days);
  const todayStr = new Date().toISOString().slice(0, 10);
  const cursor = new Date();
  if (!daySet.has(todayStr)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let current = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { current, longest, last: days[days.length - 1] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Missing auth", { status: 401, headers: corsHeaders });
    }

    // Verify the caller's JWT and get their user id.
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response("Invalid session", { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    const { data: profile } = await admin
      .from("profiles")
      .select("leetcode_username")
      .eq("id", userId)
      .single();
    if (!profile?.leetcode_username) {
      return new Response(JSON.stringify({ error: "No LeetCode username connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [recent, total] = await Promise.all([
      fetchRecentSolves(profile.leetcode_username),
      fetchTotalSolved(profile.leetcode_username),
    ]);

    const rows = recent.map((s: { titleSlug: string; title: string; timestamp: string }) => ({
      user_id: userId,
      title_slug: s.titleSlug,
      title: s.title,
      solved_at: new Date(Number(s.timestamp) * 1000).toISOString(),
    }));
    if (rows.length) {
      await admin.from("leetcode_solves").upsert(rows, { onConflict: "user_id,title_slug" });
    }

    const { data: allSolves } = await admin
      .from("leetcode_solves")
      .select("solved_at")
      .eq("user_id", userId);
    const dates = (allSolves ?? []).map((r: { solved_at: string }) => r.solved_at.slice(0, 10));
    const { current, longest, last } = computeStreak(dates);

    await admin.from("streaks").upsert({
      user_id: userId,
      current_streak: current,
      longest_streak: longest,
      last_solved_date: last,
      total_solved: total,
      updated_at: new Date().toISOString(),
    });

    // Mark today's group POTD as solved if applicable (mirrors sync-leetcode).
    const today = new Date().toISOString().slice(0, 10);
    const todaysSlugs = new Set(
      rows.filter((r) => r.solved_at.slice(0, 10) === today).map((r) => r.title_slug)
    );
    if (todaysSlugs.size > 0) {
      const { data: memberships } = await admin.from("group_members").select("group_id").eq("user_id", userId);
      for (const m of memberships ?? []) {
        const { data: potd } = await admin
          .from("problem_of_the_day")
          .select("id, title_slug")
          .eq("group_id", m.group_id)
          .eq("date", today)
          .maybeSingle();
        if (potd && todaysSlugs.has(potd.title_slug)) {
          await admin.from("potd_solves").upsert({ potd_id: potd.id, user_id: userId });
        }
      }
    }

    return new Response(
      JSON.stringify({ current_streak: current, longest_streak: longest, total_solved: total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
