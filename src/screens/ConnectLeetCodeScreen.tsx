import React, { useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius, fonts } from "@/theme/theme";
import { Screen, TextField, Button } from "@/components/Shared";
import { useConnectLeetCode } from "@/hooks/useStreak";
import { useResponsive } from "@/hooks/useResponsive";
import { AppIcon } from "@/components/AppIcon";
import { supabase } from "@/lib/supabase";
import { useAlert } from "@/context/AlertContext";

// Fetches the public LeetCode profile to extract the email/social handle.
// LeetCode exposes userPublicProfile via their internal GraphQL API.
async function fetchLeetCodeEmail(username: string): Promise<string | null> {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query userPublicProfile($username: String!) {
          matchedUser(username: $username) {
            profile { realName }
            username
          }
        }`,
        variables: { username },
      }),
    });
    // LeetCode does NOT expose email in public API — we check username existence only.
    const json = await res.json();
    const matched = json?.data?.matchedUser;
    // Return null if user not found (404-equivalent from GraphQL)
    if (!matched) return "__NOT_FOUND__";
    return null; // User found but email not exposed; skip email check
  } catch {
    return null;
  }
}

export function ConnectLeetCodeScreen({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const connect = useConnectLeetCode(userId);
  const { showAlert } = useAlert();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function submit() {
    setError(null);
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Enter your LeetCode username");
      return;
    }

    setVerifying(true);
    try {
      // Step 1: Verify the LeetCode username actually exists
      const result = await fetchLeetCodeEmail(trimmed);
      if (result === "__NOT_FOUND__") {
        setError("That LeetCode username wasn't found. Please double-check it.");
        return;
      }

      // Step 2: Get the signed-in user's email for display/info
      const { data: userData } = await supabase.auth.getUser();
      const signInEmail = userData?.user?.email;

      // Step 3: Connect
      await connect.mutateAsync(trimmed);

      showAlert({
        type: "success",
        title: "LeetCode Connected!",
        message: signInEmail
          ? `Connected as "${trimmed}". Your LeetCode activity will be synced automatically. Signed in with: ${signInEmail}`
          : `Connected as "${trimmed}". Your activity will now sync automatically.`,
        buttons: [{ text: "Let's go!", onPress: onDone }],
      });
    } catch (e: any) {
      setError("Couldn't connect that username — double check it and try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Screen style={!isMobile ? styles.desktopCenter : undefined}>
      <View
        style={[
          styles.container,
          !isMobile && [styles.desktopCard, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <View style={styles.icon}>
          <AppIcon name="link" size={34} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Connect LeetCode</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter your LeetCode username. We only read your public submissions —
          no password needed. Make sure "Submissions" is set to public in your
          LeetCode privacy settings.
        </Text>

        {/* Email info banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <AppIcon name="activity" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Your LeetCode username is verified to exist before connecting.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            placeholder="LeetCode username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          {error && (
            <View style={[styles.errorRow, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "40" }]}>
              <AppIcon name="close" size={13} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          )}
          <Button title="Connect" onPress={submit} loading={connect.isPending || verifying} />
          <Button title="I'll do this later" variant="secondary" onPress={onDone} />
        </View>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          We sync automatically every ~15 minutes, plus instantly whenever you
          open the app or pull to refresh.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  desktopCenter: { justifyContent: "center", alignItems: "center" },
  desktopCard: {
    flex: 0,
    width: 480,
    maxWidth: "90%",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignSelf: "center",
  },
  icon: { alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", fontFamily: fonts.display },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: spacing.xs, lineHeight: 20 },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  infoText: { fontSize: 12, flex: 1, lineHeight: 16 },
  form: { gap: spacing.sm },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  note: { fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
