import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  TextInput as RNTextInput,
  TextInputProps,
  SafeAreaView,
  Platform,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius, fonts } from "@/theme/theme";

import { useResponsive } from "@/hooks/useResponsive";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const { maxContentWidth } = useResponsive();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.webContainer, { maxWidth: maxContentWidth }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={{ color: colors.textMuted, marginTop: spacing.sm, fontWeight: "500" }}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Text style={{ color: colors.danger, textAlign: "center", marginBottom: spacing.sm, fontSize: 15 }}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={[styles.button, { backgroundColor: colors.border }, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

// Shown when there's cached data but a background refresh failed (e.g. no
// network) — keeps stale-but-useful content visible instead of an error screen.
export function OfflineBanner({ visible }: { visible: boolean }) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={[styles.banner, { backgroundColor: colors.border }]}>
      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>
        Couldn't refresh — showing the last saved data.
      </Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: colors.primary }
          : { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
        (disabled || loading) && { opacity: 0.6 },
        Platform.OS === "web" && ({ cursor: disabled || loading ? "default" : "pointer" } as any),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : colors.text} />
      ) : (
        <Text style={{ color: isPrimary ? "#fff" : colors.text, fontWeight: "600", fontSize: 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TextField(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <RNTextInput
      placeholderTextColor={colors.textMuted}
      style={[
        styles.input,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        Platform.OS === "web" && ({ outlineStyle: "none" } as any),
        props.style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  webContainer: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 720 : "100%",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  button: {
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    fontFamily: fonts.body,
  },
  banner: {
    paddingVertical: spacing.xs + 2,
    alignItems: "center",
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
});
