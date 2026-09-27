import { useQuery } from "@tanstack/react-query";

export type LeetCodeDetails = {
  username: string;
  name: string | null;
  avatar: string | null;
  ranking: number | null;
  reputation: number;
  contributionPoint: number;
  country: string | null;
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  totalEasy: number;
  mediumSolved: number;
  totalMedium: number;
  hardSolved: number;
  totalHard: number;
  gitHub: string | null;
  twitter: string | null;
  website: string | null;
};

const LEETCODE_GQL = "https://leetcode.com/graphql";
const ALFA_BASE_URL = "https://alfa-leetcode-api.onrender.com";

const GQL_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      githubUrl
      twitterUrl
      linkedinUrl
      profile {
        realName
        userAvatar
        ranking
        reputation
        countryName
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    allQuestionsCount {
      difficulty
      count
    }
  }
`;

async function fetchFromDirectGraphQL(cleanUsername: string): Promise<LeetCodeDetails | null> {
  const res = await fetch(LEETCODE_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    body: JSON.stringify({ query: GQL_QUERY, variables: { username: cleanUsername } }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  if (json.errors || !json.data?.matchedUser) {
    if (json.errors?.[0]?.message?.includes("does not exist")) {
      throw new Error(`LeetCode user "${cleanUsername}" does not exist.`);
    }
    return null;
  }

  const user = json.data.matchedUser;
  const profile = user.profile || {};
  const acStats: Array<{ difficulty: string; count: number }> = user.submitStatsGlobal?.acSubmissionNum || [];
  const qStats: Array<{ difficulty: string; count: number }> = json.data.allQuestionsCount || [];

  const getCount = (arr: typeof acStats, diff: string) => arr.find((s) => s.difficulty === diff)?.count ?? 0;

  return {
    username: user.username || cleanUsername,
    name: profile.realName || null,
    avatar: profile.userAvatar || null,
    ranking: profile.ranking || null,
    reputation: profile.reputation || 0,
    contributionPoint: 0,
    country: profile.countryName || null,
    totalSolved: getCount(acStats, "All"),
    totalQuestions: getCount(qStats, "All"),
    easySolved: getCount(acStats, "Easy"),
    totalEasy: getCount(qStats, "Easy"),
    mediumSolved: getCount(acStats, "Medium"),
    totalMedium: getCount(qStats, "Medium"),
    hardSolved: getCount(acStats, "Hard"),
    totalHard: getCount(qStats, "Hard"),
    gitHub: user.githubUrl || null,
    twitter: user.twitterUrl || null,
    website: user.linkedinUrl || null,
  };
}

async function fetchFromAlfaAPI(cleanUsername: string): Promise<LeetCodeDetails> {
  const [userRes, statsRes] = await Promise.all([
    fetch(`${ALFA_BASE_URL}/${cleanUsername}`).catch(() => null),
    fetch(`${ALFA_BASE_URL}/userProfile/${cleanUsername}`).catch(() => null),
  ]);

  const userData = userRes && userRes.ok ? await userRes.json().catch(() => ({})) : {};
  const statsData = statsRes && statsRes.ok ? await statsRes.json().catch(() => ({})) : {};

  if (userData.errors || statsData.errors || (!userData.name && !statsData.totalSolved && !userData.username)) {
    throw new Error(`LeetCode user "${cleanUsername}" could not be found.`);
  }

  return {
    username: cleanUsername,
    name: userData.name || null,
    avatar: userData.avatar || null,
    ranking: statsData.ranking ?? userData.ranking ?? null,
    reputation: statsData.reputation ?? userData.reputation ?? 0,
    contributionPoint: statsData.contributionPoint ?? 0,
    country: userData.country || null,
    totalSolved: statsData.totalSolved ?? 0,
    totalQuestions: statsData.totalQuestions ?? 0,
    easySolved: statsData.easySolved ?? 0,
    totalEasy: statsData.totalEasy ?? 0,
    mediumSolved: statsData.mediumSolved ?? 0,
    totalMedium: statsData.totalMedium ?? 0,
    hardSolved: statsData.hardSolved ?? 0,
    totalHard: statsData.totalHard ?? 0,
    gitHub: userData.gitHub || null,
    twitter: userData.twitter || null,
    website: Array.isArray(userData.website) && userData.website.length ? userData.website[0] : null,
  };
}

async function fetchLeetCodeDetails(username: string): Promise<LeetCodeDetails> {
  if (!username.trim()) {
    throw new Error("No username provided");
  }

  const cleanUsername = username.trim();

  // Try direct LeetCode GraphQL first for instant, real-time data
  try {
    const directData = await fetchFromDirectGraphQL(cleanUsername);
    if (directData) return directData;
  } catch (err: any) {
    if (err.message?.includes("does not exist")) {
      throw err;
    }
  }

  // Fallback to Alfa LeetCode API if direct fetch is blocked (e.g. CORS in web)
  return fetchFromAlfaAPI(cleanUsername);
}

export function useLeetCodeDetails(username: string | null | undefined) {
  return useQuery({
    queryKey: ["leetcodeDetails", username],
    queryFn: () => fetchLeetCodeDetails(username!),
    enabled: !!username && username.trim().length > 0,
    staleTime: 60_000,
    retry: 2,
  });
}
