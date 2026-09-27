import React, { useRef, useState } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { Screen, LoadingState, ErrorState, TextField, Button } from "@/components/Shared";
import { ProblemOfDayCard } from "@/components/ProblemOfDayCard";
import { MessageBubble } from "@/components/MessageBubble";
import { useChatMessages, useSendMessage } from "@/hooks/useChat";
import { useTodaysPotd } from "@/hooks/usePotd";
import { useGroupMembers } from "@/hooks/useGroup";
import { useResponsive } from "@/hooks/useResponsive";
import type { Group } from "@/types/database";

export function ChatScreen({ userId, group }: { userId: string; group: Group }) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const { data: messages, isLoading, isError, refetch } = useChatMessages(group.id);
  const { data: potdData } = useTodaysPotd(group.id);
  const { data: members } = useGroupMembers(group.id);
  const sendMessage = useSendMessage(group.id, userId);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);

  const nameFor = (id: string) => members?.find((m) => m.id === id)?.display_name
    || members?.find((m) => m.id === id)?.username
    || "Someone";

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    try {
      await sendMessage.mutateAsync({ content, potdDate: potdData?.potd?.date ?? null });
    } catch {
      setDraft(content); // put it back so nothing is silently lost on failure
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading chat..." />
      </Screen>
    );
  }

  if (isError && !messages) {
    return (
      <Screen>
        <ErrorState message="Couldn't load chat." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen style={!isMobile ? styles.desktopScreenPadding : undefined}>
      <View
        style={[
          styles.mainContainer,
          !isMobile && [styles.desktopCard, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <View style={{ padding: spacing.md }}>
            <ProblemOfDayCard
              potd={potdData?.potd ?? null}
              solvedCount={potdData?.solvedByUserIds.length ?? 0}
              memberCount={members?.length ?? 0}
              onPropose={() => {}}
            />
          </View>

          <FlatList
            ref={listRef}
            data={messages ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <MessageBubble message={item} authorName={nameFor(item.user_id)} isMine={item.user_id === userId} />
            )}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ flex: 1 }}>
              <TextField
                placeholder="Message the group..."
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={send}
                returnKeyType="send"
              />
            </View>
            <Button title="Send" onPress={send} disabled={!draft.trim()} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, width: "100%" },
  desktopScreenPadding: { padding: spacing.lg },
  desktopCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  list: { padding: spacing.md, flexGrow: 1 },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});
