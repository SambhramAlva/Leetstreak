// Supabase Edge Function: sync-leetcode
//
// Runs on a cron schedule (every ~15 min). For every profile with a
// leetcode_username set:
//   1. Pulls recent accepted submissions + total-solved stats from LeetCode's
//      public (unofficial) GraphQL endpoint.
//   2. Upserts new solves into `leetcode_solves`.
//   3. Recomputes `streaks`.
//   4. If a new solve matches today's group Problem of the Day, marks it in
//      `potd_solves` and sends a best-effort push notification to groupmates.
//
// Deploy: supabase functions deploy sync-leetcode
// Schedule: Dashboard -> Edge Functions -> sync-leetcode -> Cron -> */15 * * * *

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN"); // optional

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const LEETCODE_GQL = "https://leetcode.com/graphql";

type RecentSubmission = {
  id: string;
  title: string;
  titleSlug: string;
  timestamp: string; // unix seconds as string
};

async function fetchRecentSolves(username: string): Promise<RecentSubmission[]> {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;
  const res = await fetch(LEETCODE_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { username, limit: 40 } }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.recentAcSubmissionList ?? [];
}

async function fetchTotalSolved(username: string): Promise<number> {
  const query = `
    query userProblemsSolved($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
      }
    }
  `;
  const res = await fetch(LEETCODE_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { username } }),
  });
  if (!res.ok) return 0;
  const json = await res.json();
  const stats = json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
  const all = stats.find((s: { difficulty: string }) => s.difficulty === "All");
  return all?.count ?? 0;
}

// Computes current + longest streak from a set of distinct solved-dates (UTC).
function computeStreak(solvedDates: string[]): { current: number; longest: number; last: string | null } {
  if (solvedDates.length === 0) return { current: 0, longest: 0, last: null };
  const days = [...new Set(solvedDates)].sort(); // ascending "YYYY-MM-DD"
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const diff = (cur.getTime() - prev.getTime()) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // current streak: walk back from today (or yesterday, so missing "today so
  // far" doesn't zero it out prematurely) while consecutive days exist.
  const daySet = new Set(days);
  const todayStr = new Date().toISOString().slice(0, 10);
  const cursor = new Date();
  if (!daySet.has(todayStr)) cursor.setUTCDate(cursor.getUTCDate() - 1); // allow "not yet today"
  let current = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { current, longest, last: days[days.length - 1] };
}

async function sendPush(tokens: string[], title: string, body: string) {
  if (!tokens.length) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: "default" }))),
  }).catch(() => {});
}

async function syncOneUser(profile: { id: string; leetcode_username: string }) {
  const [recent, total] = await Promise.all([
    fetchRecentSolves(profile.leetcode_username),
    fetchTotalSolved(profile.leetcode_username),
  ]);
  if (recent.length === 0 && total === 0) return; // bad username / private profile / API hiccup

  // Upsert solves (unique on user_id + title_slug, so re-syncs are cheap no-ops).
  const rows = recent.map((s) => ({
    user_id: profile.id,
    title_slug: s.titleSlug,
    title: s.title,
    solved_at: new Date(Number(s.timestamp) * 1000).toISOString(),
  }));
  if (rows.length) {
    await supabase.from("leetcode_solves").upsert(rows, { onConflict: "user_id,title_slug" });
  }

  // Recompute streak from ALL solves on file (cheap: one indexed query).
  const { data: allSolves } = await supabase
    .from("leetcode_solves")
    .select("solved_at")
    .eq("user_id", profile.id);
  const dates = (allSolves ?? []).map((r: { solved_at: string }) => r.solved_at.slice(0, 10));
  const { current, longest, last } = computeStreak(dates);

  await supabase.from("streaks").upsert({
    user_id: profile.id,
    current_streak: current,
    longest_streak: longest,
    last_solved_date: last,
    total_solved: total,
    updated_at: new Date().toISOString(),
  });

  // Check today's new solves against each group's Problem of the Day.
  const today = new Date().toISOString().slice(0, 10);
  const todaysSlugs = new Set(
    rows.filter((r) => r.solved_at.slice(0, 10) === today).map((r) => r.title_slug)
  );
  if (todaysSlugs.size === 0) return;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", profile.id);

  for (const m of memberships ?? []) {
    const { data: potd } = await supabase
      .from("problem_of_the_day")
      .select("id, title_slug, title, group_id")
      .eq("group_id", m.group_id)
      .eq("date", today)
      .maybeSingle();
    if (!potd || !todaysSlugs.has(potd.title_slug)) continue;

    const { error: insertErr } = await supabase
      .from("potd_solves")
      .insert({ potd_id: potd.id, user_id: profile.id })
      .select()
      .single();
    if (insertErr) continue; // already recorded

    // Notify groupmates (best-effort; missing EXPO_ACCESS_TOKEN just no-ops).
    const { data: mates } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", potd.group_id)
      .neq("user_id", profile.id);
    const mateIds = (mates ?? []).map((r: { user_id: string }) => r.user_id);
    if (mateIds.length) {
      const { data: tokenRows } = await supabase
        .from("push_tokens")
        .select("expo_push_token")
        .in("user_id", mateIds);
      const tokens = (tokenRows ?? []).map((r: { expo_push_token: string }) => r.expo_push_token);
      await sendPush(tokens, "Problem of the Day solved! 🎉", `Someone just solved "${potd.title}"`);
    }
  }
}

Deno.serve(async (req) => {
  try {
    // Optional: restrict to a single user for on-demand-style testing via ?user_id=
    const url = new URL(req.url);
    const singleUserId = url.searchParams.get("user_id");

    let query = supabase
      .from("profiles")
      .select("id, leetcode_username")
      .not("leetcode_username", "is", null);
    if (singleUserId) query = query.eq("id", singleUserId);

    const { data: profiles, error } = await query;
    if (error) throw error;

    // Sync sequentially in small batches to be polite to LeetCode's endpoint.
    const batchSize = 5;
    for (let i = 0; i < (profiles ?? []).length; i += batchSize) {
      const batch = profiles!.slice(i, i + batchSize);
      await Promise.all(batch.map((p) => syncOneUser(p as { id: string; leetcode_username: string })));
    }

    return new Response(JSON.stringify({ synced: profiles?.length ?? 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
