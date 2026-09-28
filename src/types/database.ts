// Hand-written types matching supabase/schema.sql.
// (In a larger project, generate these with `supabase gen types typescript`.)

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  leetcode_username: string | null;
  timezone: string;
  reminder_hour: number;
  reminder_minute: number;
  reminder_enabled: boolean;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
};

export type Streak = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_solved_date: string | null;
  total_solved: number;
  updated_at: string;
};

export type ProblemOfTheDay = {
  id: string;
  group_id: string;
  date: string;
  title_slug: string;
  title: string;
  url: string;
  proposed_by: string;
  created_at: string;
};

export type Message = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  potd_date: string | null;
  created_at: string;
};

export type LeetcodeSolve = {
  id: string;
  user_id: string;
  title_slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard" | null;
  solved_at: string;
  synced_at: string;
};

export type AppAdmin = {
  user_id: string;
  granted_by: string | null;
  created_at: string;
};

export type AppSetting = {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type AdminAuditLog = {
  id: string;
  actor_id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};


