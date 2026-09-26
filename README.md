# LeetStreak

A minimal cross-platform (iOS + Android) app for a friend group to keep each other
accountable on daily LeetCode streaks: create/join a group, connect your LeetCode
username, auto-sync solves, see everyone's streak, agree on a Problem of the Day,
and chat about it.

---

## 1. Tech stack

| Layer            | Choice                                            | Why |
|-------------------|----------------------------------------------------|-----|
| Client            | **Expo (React Native + TypeScript)**               | One codebase → iOS + Android, OTA updates, great DX, no native build step needed for most of this app. |
| Navigation        | React Navigation (bottom tabs)                      | Standard, simple. |
| Backend           | **Supabase** (Postgres + Auth + Realtime + Edge Functions + Row-Level Security) | Gives you auth, a real database, realtime chat, and serverless functions without running your own server. Free tier is enough for a friend group. |
| State/data fetch  | React Query (`@tanstack/react-query`)               | Caching, retries, loading/error states, works well offline-first. |
| Local state       | Zustand (tiny, for auth/session + theme)            | Avoids Redux boilerplate. |
| Push/local notifications | `expo-notifications`                         | Daily reminder (local, works offline) + optional server push for group events. |
| LeetCode data     | LeetCode's public (unofficial) GraphQL endpoint, polled from a Supabase Edge Function | See §4 — there is no official LeetCode API. |

This is intentionally **not** over-engineered: no microservices, no custom backend
server, no native modules. Supabase is the entire backend.

---

## 2. Database schema (Postgres, via Supabase)

See `supabase/schema.sql` for the full, runnable SQL (tables, indexes, RLS
policies, and a helper trigger). Summary:

```
profiles            (1 row per user; username, leetcode_username, reminder_time, timezone)
groups              (id, name, invite_code)
group_members        (group_id, user_id, role)              -- membership + who's in which group
leetcode_solves       (user_id, title_slug, title, difficulty, solved_at)  -- one row per problem ever solved
streaks              (user_id, current_streak, longest_streak, last_solved_date)  -- derived/cached
problem_of_the_day    (group_id, date, title_slug, title, url, proposed_by)
potd_solves           (potd_id, user_id, solved_at)          -- who solved today's group problem
messages             (group_id, user_id, content, created_at, potd_date)  -- chat, tagged to a day's POTD
push_tokens          (user_id, expo_push_token)
```

Design notes:
- `leetcode_solves` is the source of truth (one row per problem, globally unique
  per user). "Solved today" and "total solved" are both just queries against it —
  no duplicated counters to keep in sync by hand.
- `streaks` is a small cached table (current/longest streak) recomputed by the
  sync function whenever new solves come in, so the Home screen can read it with
  a single cheap query instead of recomputing on every render.
- **Row-Level Security is on for every table.** A user can only read/write rows
  for groups they are a member of (see policies in `schema.sql`). This is the
  "database security" requirement — it's enforced by Postgres itself, not just
  the app.

---

## 3. App architecture

```
Screens  →  Hooks (React Query)  →  Supabase client (typed)  →  Postgres (RLS)
                                   ↘ Realtime subscriptions (chat, live streaks)

Edge Functions (serverless, run on Supabase):
  sync-leetcode       – cron job, runs every ~15 min, syncs ALL users' LeetCode data
  sync-leetcode-self  – callable on-demand from the app (pull-to-refresh / app open),
                         syncs just the current user for a fast "did I solve it" check
```

- **Screens** are dumb-ish and only handle layout/UI state.
- **Hooks** (`useGroup`, `useStreak`, `useChat`, ...) own data-fetching, caching,
  loading/error states via React Query, and offline behavior (React Query retries
  + serves cached data when there's no network).
- **Supabase client** (`src/lib/supabase.ts`) is the single point of contact with
  the backend; auth session is persisted with `expo-secure-store` so users stay
  logged in.
- **Edge Functions** are the only thing that talks to LeetCode. The app never
  calls LeetCode directly (avoids CORS issues and keeps the polling logic in one
  place, shared by cron + on-demand sync).
- **Realtime**: `messages` and `streaks` are subscribed to via Supabase Realtime,
  so chat and "who solved it" update live across devices without polling.

---

## 4. LeetCode integration approach

LeetCode has **no official public API or OAuth**. The realistic, widely-used
approach (the same one every open-source LeetCode tracker uses) is:

1. User types in their **public LeetCode username** (no password, no OAuth —
   nothing to steal). We tell them their submissions must be set to "public" in
   LeetCode's privacy settings, which is the default.
2. A Supabase Edge Function calls LeetCode's own website GraphQL endpoint
   (`https://leetcode.com/graphql`), the same one leetcode.com's frontend uses,
   with two queries:
   - `recentAcSubmissionList(username, limit)` → recent accepted submissions
     (title, slug, timestamp) → used to detect **new solves** and "solved today".
   - `matchedUser(username) { submitStatsGlobal }` → **total solved count** by
     difficulty → used for the "total problems solved" stat.
3. New submissions are upserted into `leetcode_solves` (deduped by
   `(user_id, title_slug)`), then `streaks` is recomputed.
4. This runs two ways:
   - **Background cron** (every 15 min) for everyone, so streaks stay fresh
     even if nobody opens the app.
   - **On-demand** call when a user opens the Home tab or pulls to refresh, for
     a near-instant "yes, that counted" feeling right after solving.

This is polling, not a webhook — LeetCode doesn't offer push/webhooks. 15 minutes
is a reasonable balance of freshness vs. not hammering an undocumented endpoint;
it's easy to tighten later. This is called out explicitly in the UI copy on the
"Connect LeetCode" screen so it's not a broken promise.

---

## 5. Notification approach

- **Daily reminder** ("maintain your streak"): a **local** notification
  scheduled with `expo-notifications`, at the time the user picks in Profile.
  Local notifications work fully offline and don't need a server — simplest and
  most reliable option for "remind me every day at 8pm".
- **Optional group nudges** ("Alex just solved today's problem"): a real **push**
  notification. The app stores each device's Expo push token in `push_tokens`;
  the `sync-leetcode` Edge Function sends a push via Expo's push API when it
  detects someone solved the group's Problem of the Day. This is small and
  additive — the app works fine without it if you skip that part.

---

## Project layout

```
leetstreak/
  App.tsx
  app.json, package.json, tsconfig.json
  src/
    lib/supabase.ts          Supabase client + secure session storage
    types/database.ts        Generated-style TS types matching schema.sql
    theme/                   Colors + light/dark ThemeProvider
    navigation/RootNavigator.tsx
    hooks/                   useAuth, useGroup, useStreak, useChat, useNotifications
    screens/                 Auth, GroupOnboarding, ConnectLeetCode, Home, Group, Chat, Profile
    components/              StreakCard, MemberRow, ProblemOfDayCard, MessageBubble
  supabase/
    schema.sql                Full DB schema + RLS policies + streak trigger
    functions/
      sync-leetcode/          Cron: syncs all users, updates POTD solves, sends pushes
      sync-leetcode-self/     On-demand: syncs just the calling user
```

---

## Setup instructions

### 1. Create the Supabase project
1. Go to https://supabase.com → New project.
2. In the SQL editor, paste and run `supabase/schema.sql`.
3. In **Authentication → Providers**, enable **Email** (magic link or
   password — either works; the app code below uses email + password for
   simplicity).
4. Grab your **Project URL** and **anon public key** from Settings → API.

### 2. Configure the app
```bash
cd leetstreak
npm install
cp .env.example .env
# edit .env with your Supabase URL + anon key
```

### 3. Deploy the Edge Functions
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy sync-leetcode
supabase functions deploy sync-leetcode-self
supabase secrets set EXPO_ACCESS_TOKEN=<optional, only if using push>
```
Schedule the cron job (Dashboard → Edge Functions → `sync-leetcode` → Cron →
`*/15 * * * *`), or via SQL using `pg_cron` — see the comment at the bottom of
`schema.sql`.

### 4. Run the app
```bash
npx expo start
```
Scan the QR code with Expo Go (iOS/Android) for local testing, or build with
EAS (`eas build`) for a real standalone app.

### 5. Try it
1. Sign up → create a group (get an invite code) or join one.
2. Connect your LeetCode username.
3. Set your reminder time in Profile.
4. Solve a problem on LeetCode, pull to refresh Home — it shows up.

---

## Building a shareable APK (so friends can just install it)

No Android Studio needed — this uses Expo's free cloud build service
(**EAS Build**), which compiles the app on Expo's servers and hands you back
a download link for a real `.apk`.

```bash
npm install -g eas-cli
eas login                       # free Expo account — sign up at expo.dev if needed
eas build:configure             # links this project to your Expo account (eas.json is already set up)
eas build -p android --profile preview
```

This takes a few minutes. When it finishes, the terminal (and your Expo
dashboard at expo.dev) shows a **download link** for the `.apk` — send that
link to your friends directly (WhatsApp, email, whatever). Each of them:

1. Opens the link on their Android phone.
2. Taps to download, then taps the downloaded file to install.
3. Android will warn about "installing from unknown sources" the first time
   — that's normal for an app not on the Play Store; they tap **Install
   anyway**.

Notes:
- This only builds **Android**. iOS apps can't be side-installed like this —
  an iPhone friend would need `eas build -p ios --profile preview` plus a
  paid Apple Developer account ($99/yr) and their device UDID registered, or
  you'd publish to TestFlight. If everyone's on Android, ignore this.
- The `preview` profile in `eas.json` is already set to build a plain
  installable `.apk` (Google Play itself requires the `.aab` format instead,
  which is what the `production` profile is for if you ever publish there).
- Rebuild and re-send the link any time you change the code — there's no
  auto-update for a side-loaded APK like this.

