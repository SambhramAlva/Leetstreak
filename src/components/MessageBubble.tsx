import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import type { Message } from "@/types/database";

export function MessageBubble({
  message,
  authorName,
  isMine,
}: {
  message: Message;
  authorName: string;
  isMine: boolean;
}) {
  const { colors } = useTheme();
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <View style={[styles.wrapper, isMine ? styles.wrapperMine : styles.wrapperTheirs]}>
      {!isMine && <Text style={[styles.author, { color: colors.textMuted }]}>{authorName}</Text>}
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={{ color: isMine ? "#fff" : colors.text, fontSize: 15 }}>{message.content}</Text>
      </View>
      <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { maxWidth: "80%", marginVertical: 4 },
  wrapperMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  wrapperTheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  author: { fontSize: 11, marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  time: { fontSize: 10, marginTop: 2, marginHorizontal: 4 },
});
