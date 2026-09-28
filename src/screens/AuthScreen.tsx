import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { useAuth } from "@/hooks/useAuth";
import { Screen, TextField, Button } from "@/components/Shared";
import { useResponsive } from "@/hooks/useResponsive";
import { AppIcon } from "@/components/AppIcon";
import { fonts } from "@/theme/theme";

export function AuthScreen() {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
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
    <Screen style={!isMobile ? styles.desktopCenter : undefined}>
      <KeyboardAvoidingView
        style={[
          styles.container,
          !isMobile && [styles.desktopCard, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.brand}><AppIcon name="flame" size={25} color={colors.primary} strokeWidth={2.5} /><Text style={[styles.logo, { color: colors.primary }]}>LeetStreak</Text></View>
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
  desktopCenter: { justifyContent: "center", alignItems: "center" },
  desktopCard: {
    flex: 0,
    width: 440,
    maxWidth: "90%",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignSelf: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  logo: { fontSize: 32, fontWeight: "800", fontFamily: fonts.display, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: spacing.md },
  form: { gap: spacing.sm },
});
