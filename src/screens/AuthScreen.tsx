import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/theme";
import { useAuth } from "@/hooks/useAuth";
import { Screen, TextField, Button } from "@/components/Shared";

export function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === "signIn") {
        await signIn(email.trim(), password);
      } else {
        if (!username.trim()) throw new Error("Pick a username");
        await signUp(email.trim(), password, username.trim());
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={[styles.logo, { color: colors.primary }]}>🔥 LeetStreak</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {mode === "signIn" ? "Welcome back" : "Create your account"}
        </Text>

        <View style={styles.form}>
          {mode === "signUp" && (
            <TextField
              placeholder="Username"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          )}
          <TextField
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={{ color: colors.danger }}>{error}</Text>}

          <Button
            title={mode === "signIn" ? "Sign in" : "Sign up"}
            onPress={submit}
            loading={loading}
            disabled={!email || !password}
          />

          <Button
            title={mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
            variant="secondary"
            onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.lg },
  logo: { fontSize: 32, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: spacing.md },
  form: { gap: spacing.sm },
});
