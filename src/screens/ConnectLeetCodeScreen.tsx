import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/theme";
import { Screen, TextField, Button } from "@/components/Shared";
import { useConnectLeetCode } from "@/hooks/useStreak";

export function ConnectLeetCodeScreen({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { colors } = useTheme();
  const connect = useConnectLeetCode(userId);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!username.trim()) {
      setError("Enter your LeetCode username");
      return;
    }
    try {
      await connect.mutateAsync(username.trim());
      onDone();
    } catch (e: any) {
      setError("Couldn't verify that username — double check it and try again.");
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.emoji}>🔗</Text>
        <Text style={[styles.title, { color: colors.text }]}>Connect LeetCode</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter your LeetCode username. We only read your public submissions —
          no password needed. Make sure "Submissions" is set to public in your
          LeetCode privacy settings.
        </Text>

        <View style={styles.form}>
          <TextField
            placeholder="LeetCode username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          {error && <Text style={{ color: colors.danger }}>{error}</Text>}
          <Button title="Connect" onPress={submit} loading={connect.isPending} />
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
  emoji: { fontSize: 40, textAlign: "center" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: spacing.md, lineHeight: 20 },
  form: { gap: spacing.sm },
  note: { fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
