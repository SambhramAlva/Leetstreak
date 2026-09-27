import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Share, Modal, ScrollView } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing, radius } from "@/theme/theme";
import { Screen, LoadingState, ErrorState, TextField, Button } from "@/components/Shared";
import { ProblemOfDayCard } from "@/components/ProblemOfDayCard";
import { MemberRow } from "@/components/MemberRow";
import { useGroupActions, useGroupMembers } from "@/hooks/useGroup";
import { useTodaysPotd, useProposePotd } from "@/hooks/usePotd";
import { useResponsive } from "@/hooks/useResponsive";
import type { Group } from "@/types/database";

// Turns a LeetCode problem URL into a slug + a readable title, e.g.
// https://leetcode.com/problems/two-sum/ -> ("two-sum", "Two Sum")
function parseLeetCodeUrl(url: string): { slug: string; title: string } | null {
  const match = url.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  if (!match) return null;
  const slug = match[1];
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { slug, title };
}

export function GroupScreen({ userId, group, groups, onSelectGroup }: { userId: string; group: Group; groups: Group[]; onSelectGroup: (group: Group) => void }) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const { data: members, isLoading: membersLoading, isError, refetch } = useGroupMembers(group.id);
  const { data: potdData, isLoading: potdLoading } = useTodaysPotd(group.id);
  const proposePotd = useProposePotd(group.id, userId);

  const [modalVisible, setModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const { joinGroup } = useGroupActions(userId);

  async function submitProposal() {
    const parsed = parseLeetCodeUrl(urlInput.trim());
    if (!parsed) {
      setFormError("Paste a valid LeetCode problem link, e.g. leetcode.com/problems/two-sum/");
      return;
    }
    try {
      await proposePotd.mutateAsync({ title: parsed.title, titleSlug: parsed.slug, url: urlInput.trim() });
      setModalVisible(false);
      setUrlInput("");
      setFormError(null);
    } catch (e: any) {
      setFormError(e.message ?? "Couldn't set the problem of the day.");
    }
  }

  function shareInvite() {
    Share.share({
      message: `Join my LeetStreak group "${group.name}"! Use invite code ${group.invite_code} in the app.`,
    });
  }

  async function joinAnotherGroup() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const joinedGroup = await joinGroup(joinCode);
      onSelectGroup(joinedGroup);
      setJoinCode("");
    } catch (error: any) {
      setJoinError(error.message ?? "Couldn't join that group");
    } finally {
      setJoining(false);
    }
  }

  if (membersLoading || potdLoading) {
    return (
      <Screen>
        <LoadingState label="Loading group..." />
      </Screen>
    );
  }

  if (isError && !members) {
    return (
      <Screen>
        <ErrorState message="Couldn't load this group." onRetry={refetch} />
      </Screen>
    );
  }

  const solvedCount = potdData?.solvedByUserIds.length ?? 0;
  const groupsSection = (
    <View style={[styles.groupsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your groups</Text>
      <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Switch groups or join another one with an invite code.</Text>
      <View style={styles.groupList}>
        {groups.map((item) => (
          <Button key={item.id} title={item.name} variant={item.id === group.id ? "primary" : "secondary"} onPress={() => onSelectGroup(item)} />
        ))}
      </View>
      <View style={styles.joinRow}>
        <TextField placeholder="Invite code (e.g. FOX-482)" autoCapitalize="characters" value={joinCode} onChangeText={setJoinCode} />
        <Button title="Join" onPress={joinAnotherGroup} loading={joining} />
      </View>
      {joinError ? <Text style={{ color: colors.danger }}>{joinError}</Text> : null}
    </View>
  );

  return (
    <Screen>
      {!isMobile ? (
        <ScrollView contentContainerStyle={styles.desktopContainer}>
          {groupsSection}
          <View style={styles.gridRow}>
            {/* Left Column: Group Info & POTD Card */}
            <View style={styles.leftCol}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                  <Text style={[styles.code, { color: colors.textMuted }]}>Invite code: {group.invite_code}</Text>
                </View>
                <Button title="Invite" onPress={shareInvite} variant="secondary" />
              </View>

              <View style={{ marginTop: spacing.lg }}>
                <ProblemOfDayCard
                  potd={potdData?.potd ?? null}
                  solvedCount={solvedCount}
                  memberCount={members?.length ?? 0}
                  onPropose={() => setModalVisible(true)}
                />
              </View>
            </View>

            {/* Right Column: Members Card */}
            <View style={styles.rightCol}>
              <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.heading, { color: colors.text, marginBottom: spacing.md }]}>Members</Text>
                {members && members.length > 0 ? (
                  members.map((m) => <MemberRow key={m.id} member={m} />)
                ) : (
                  <Text style={{ color: colors.textMuted, textAlign: "center", padding: spacing.md }}>
                    No members yet.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={members ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
              {groupsSection}
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                  <Text style={[styles.code, { color: colors.textMuted }]}>Code: {group.invite_code}</Text>
                </View>
                <Button title="Invite" onPress={shareInvite} variant="secondary" />
              </View>

              <ProblemOfDayCard
                potd={potdData?.potd ?? null}
                solvedCount={solvedCount}
                memberCount={members?.length ?? 0}
                onPropose={() => setModalVisible(true)}
              />

              <Text style={[styles.heading, { color: colors.text }]}>Members</Text>
            </View>
          }
          renderItem={({ item }) => <MemberRow member={item} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalBackdrop, !isMobile && styles.modalBackdropDesktop]}>
          <View style={[styles.modalCard, !isMobile && styles.modalCardDesktop, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Propose today's problem</Text>
            <TextField
              placeholder="https://leetcode.com/problems/two-sum/"
              autoCapitalize="none"
              value={urlInput}
              onChangeText={setUrlInput}
            />
            {formError && <Text style={{ color: colors.danger, marginTop: spacing.xs }}>{formError}</Text>}
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Set problem" onPress={submitProposal} loading={proposePotd.isPending} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { fontSize: 22, fontWeight: "700" },
  code: { fontSize: 13, marginTop: 2 },
  heading: { fontSize: 16, fontWeight: "700", marginTop: spacing.sm },
  groupsSection: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionHint: { fontSize: 13, marginBottom: spacing.sm },
  groupList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  joinRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  desktopContainer: { padding: spacing.lg },
  gridRow: { flexDirection: "row", gap: spacing.xl, alignItems: "flex-start" },
  leftCol: { flex: 1 },
  rightCol: { flex: 1 },
  cardBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBackdropDesktop: { justifyContent: "center", alignItems: "center" },
  modalCard: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  modalCardDesktop: { width: 500, maxWidth: "90%", borderRadius: radius.lg, borderWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: spacing.md },
});
