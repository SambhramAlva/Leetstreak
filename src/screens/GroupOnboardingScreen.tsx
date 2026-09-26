import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/theme";
import { Screen, TextField, Button } from "@/components/Shared";
import { useGroupActions } from "@/hooks/useGroup";

export function GroupOnboardingScreen({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const { createGroup, joinGroup } = useGroupActions(userId);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === "create") {
        if (!name.trim()) throw new Error("Give your group a name");
        await createGroup(name.trim());
      } else {
        if (!code.trim()) throw new Error("Enter an invite code");
        await joinGroup(code.trim());
      }
      // useMyGroup query invalidates on success, so RootNavigator will switch
      // to the main tabs automatically once the group appears.
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === "create" ? "Start a group" : "Join a group"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {mode === "create"
            ? "You'll get an invite code to share with friends."
            : "Ask a friend for their group's invite code."}
        </Text>

        <View style={styles.form}>
          {mode === "create" ? (
            <TextField placeholder="Group name (e.g. Grind Squad)" value={name} onChangeText={setName} />
          ) : (
            <TextField
              placeholder="Invite code (e.g. FOX-482)"
              autoCapitalize="characters"
              value={code}
              onChangeText={setCode}
            />
          )}

          {error && <Text style={{ color: colors.danger }}>{error}</Text>}

          <Button
            title={mode === "create" ? "Create group" : "Join group"}
            onPress={submit}
            loading={loading}
          />
          <Button
            title={mode === "create" ? "I have an invite code instead" : "Create a new group instead"}
            variant="secondary"
            onPress={() => setMode(mode === "create" ? "join" : "create")}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: spacing.md },
  form: { gap: spacing.sm },
});
