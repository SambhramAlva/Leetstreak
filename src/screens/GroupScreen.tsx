import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, spacing } from "@/theme/theme";
import { AppIcon } from "@/components/AppIcon";
import { Button, ErrorState, LoadingState, Screen, TextField } from "@/components/Shared";
import { MemberRow } from "@/components/MemberRow";
import { ProblemOfDayCard } from "@/components/ProblemOfDayCard";
import { useDiscoverableGroups, useGroupActions, useGroupMembers } from "@/hooks/useGroup";
import { useProposePotd, useTodaysPotd } from "@/hooks/usePotd";
import { useResponsive } from "@/hooks/useResponsive";
import type { DiscoverableGroup, Group } from "@/types/database";

function parseLeetCodeUrl(url: string) {
  const match = url.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  if (!match) return null;
  const slug = match[1];
  return { slug, title: slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") };
}

function GroupIcon({ size = 48 }: { size?: number }) {
  const { colors } = useTheme();
  return <View style={[styles.groupIcon, { width: size, height: size, borderRadius: size / 3, backgroundColor: `${colors.primary}20` }]}><AppIcon name="group" size={size * 0.48} color={colors.primary} strokeWidth={2.2} /></View>;
}

function GroupListCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}>
    <GroupIcon /><View style={styles.groupCardBody}><Text style={[styles.groupCardName, { color: colors.text }]} numberOfLines={1}>{group.name}</Text><View style={styles.metaRow}><AppIcon name="user" size={13} color={colors.textMuted} /><Text style={[styles.groupCardMeta, { color: colors.textMuted }]}>{group.member_count ?? 0} {group.member_count === 1 ? "member" : "members"}</Text></View></View><AppIcon name="down" size={18} color={colors.textMuted} />
  </Pressable>;
}

function DiscoverCard({ group, joining, onJoin }: { group: DiscoverableGroup; joining: boolean; onJoin: () => void }) {
  const { colors } = useTheme();
  return <View style={[styles.discoverCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
    <GroupIcon size={42} /><View style={styles.groupCardBody}><Text style={[styles.groupCardName, { color: colors.text }]} numberOfLines={1}>{group.name}</Text><View style={styles.metaRow}><AppIcon name="user" size={13} color={colors.textMuted} /><Text style={[styles.groupCardMeta, { color: colors.textMuted }]}>{group.member_count} {group.member_count === 1 ? "member" : "members"}</Text></View></View><Button title="Join" onPress={onJoin} loading={joining} />
  </View>;
}

export function GroupScreen({ userId, group, groups, onSelectGroup }: { userId: string; group: Group; groups: Group[]; onSelectGroup: (group: Group) => void }) {
  const { colors } = useTheme();
  const { isMobile } = useResponsive();
  const [view, setView] = useState<"list" | "details">("list");
  const [discoverVisible, setDiscoverVisible] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [potdModalVisible, setPotdModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const discover = useDiscoverableGroups(userId);
  const membersQuery = useGroupMembers(view === "details" ? group.id : undefined);
  const potdQuery = useTodaysPotd(view === "details" ? group.id : undefined);
  const proposePotd = useProposePotd(group.id, userId);
  const { joinGroupById } = useGroupActions(userId);

  function openGroup(nextGroup: Group) { onSelectGroup(nextGroup); setView("details"); }
  async function joinGroup(groupId: string) {
    setJoiningId(groupId);
    setJoinError(null);
    try { openGroup(await joinGroupById(groupId)); setDiscoverVisible(false); } catch (error: any) { setJoinError(error.message ?? "Couldn't join this group."); } finally { setJoiningId(null); }
  }
  async function submitProposal() {
    const parsed = parseLeetCodeUrl(urlInput.trim());
    if (!parsed) { setFormError("Paste a valid LeetCode problem link."); return; }
    try { await proposePotd.mutateAsync({ title: parsed.title, titleSlug: parsed.slug, url: urlInput.trim() }); setPotdModalVisible(false); setUrlInput(""); setFormError(null); }
    catch (error: any) { setFormError(error.message ?? "Couldn't set the problem of the day."); }
  }

  if (view === "list") return <Screen><View style={styles.screenContent}>
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.pageHeader}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>COMMUNITY</Text><Text style={[styles.pageTitle, { color: colors.text }]}>Your groups</Text><Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Keep your daily momentum together.</Text></View><View style={[styles.groupCount, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.groupCountNumber, { color: colors.text }]}>{groups.length}</Text><Text style={[styles.groupCountLabel, { color: colors.textMuted }]}>joined</Text></View></View>
      <View style={styles.groupList}>{groups.map((item) => <GroupListCard key={item.id} group={item} onPress={() => openGroup(item)} />)}</View>
      <Text style={[styles.listHint, { color: colors.textMuted }]}>Choose a group to see today&apos;s progress and members.</Text>
    </ScrollView>
    <Pressable accessibilityLabel="Discover and join a group" onPress={() => { setDiscoverVisible(true); discover.refetch(); }} style={[styles.floatingButton, { backgroundColor: colors.primary }, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}><Text style={styles.plus}>+</Text></Pressable>
    <DiscoverModal visible={discoverVisible} onClose={() => setDiscoverVisible(false)} groups={discover.data ?? []} loading={discover.isLoading} error={discover.isError} onRetry={discover.refetch} joiningId={joiningId} joinError={joinError} onJoin={joinGroup} isMobile={isMobile} />
  </View></Screen>;

  if (membersQuery.isLoading || potdQuery.isLoading) return <Screen><LoadingState label="Loading group..." /></Screen>;
  if (membersQuery.isError && !membersQuery.data) return <Screen><ErrorState message="Couldn&apos;t load this group." onRetry={membersQuery.refetch} /></Screen>;
  const members = membersQuery.data ?? [];
  return <Screen>
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable onPress={() => setView("list")} style={[styles.backButton, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}><AppIcon name="up" size={16} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>All groups</Text></Pressable>
      <View style={styles.detailHeader}><View style={styles.detailTitleRow}><GroupIcon size={56} /><View style={styles.groupCardBody}><Text style={[styles.pageTitle, { color: colors.text }]}>{group.name}</Text><Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>{members.length} members keeping each other accountable</Text></View></View><Button title="Invite" onPress={() => Share.share({ message: `Join my LeetStreak group "${group.name}"! Use invite code ${group.invite_code} in the app.` })} variant="secondary" /></View>
      <View style={[styles.memberPanel, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.panelHeader}><View><Text style={[styles.panelTitle, { color: colors.text }]}>Members</Text><Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>Current streaks from your group</Text></View><AppIcon name="flame" size={22} color={colors.primary} /></View>{members.length ? members.map((member) => <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><MemberRow member={member} /></View>) : <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members yet.</Text>}</View>
      <ProblemOfDayCard potd={potdQuery.data?.potd ?? null} solvedCount={potdQuery.data?.solvedByUserIds.length ?? 0} memberCount={members.length} onPropose={() => setPotdModalVisible(true)} />
    </ScrollView>
    <Modal visible={potdModalVisible} animationType="slide" transparent><View style={[styles.modalBackdrop, !isMobile && styles.modalBackdropDesktop]}><View style={[styles.modalCard, !isMobile && styles.modalCardDesktop, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.modalTitle, { color: colors.text }]}>Propose today&apos;s problem</Text><TextField placeholder="https://leetcode.com/problems/two-sum/" autoCapitalize="none" value={urlInput} onChangeText={setUrlInput} />{formError ? <Text style={{ color: colors.danger, marginTop: spacing.xs }}>{formError}</Text> : null}<View style={styles.modalActions}><View style={styles.modalAction}><Button title="Cancel" variant="secondary" onPress={() => setPotdModalVisible(false)} /></View><View style={styles.modalAction}><Button title="Set problem" onPress={submitProposal} loading={proposePotd.isPending} /></View></View></View></View></Modal>
  </Screen>;
}

function DiscoverModal({ visible, onClose, groups, loading, error, onRetry, joiningId, joinError, onJoin, isMobile }: { visible: boolean; onClose: () => void; groups: DiscoverableGroup[]; loading: boolean; error: boolean; onRetry: () => void; joiningId: string | null; joinError: string | null; onJoin: (id: string) => void; isMobile: boolean }) {
  const { colors } = useTheme();
  return <Modal visible={visible} animationType="slide" transparent><View style={[styles.modalBackdrop, !isMobile && styles.modalBackdropDesktop]}><View style={[styles.discoverModal, !isMobile && styles.discoverModalDesktop, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.panelHeader}><View><Text style={[styles.modalTitle, { color: colors.text }]}>Discover groups</Text><Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>Find a new place to practice together.</Text></View><Pressable accessibilityLabel="Close discover groups" onPress={onClose}><AppIcon name="close" size={22} color={colors.textMuted} /></Pressable></View>{joinError ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{joinError}</Text> : null}{loading ? <LoadingState label="Finding groups..." /> : error ? <ErrorState message="Couldn&apos;t load groups." onRetry={onRetry} /> : groups.length ? <ScrollView contentContainerStyle={styles.discoverList}>{groups.map((item) => <DiscoverCard key={item.id} group={item} joining={joiningId === item.id} onJoin={() => onJoin(item.id)} />)}</ScrollView> : <Text style={[styles.emptyText, { color: colors.textMuted }]}>There are no new groups to join right now.</Text>}</View></View></Modal>;
}

const styles = StyleSheet.create({
  screenContent: { flex: 1 }, page: { padding: spacing.lg, paddingBottom: 100, gap: spacing.lg }, pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: spacing.xs }, pageTitle: { fontSize: 26, fontWeight: "700" }, pageSubtitle: { fontSize: 14, marginTop: 3 }, groupCount: { borderWidth: 1, borderRadius: radius.lg, alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, groupCountNumber: { fontSize: 22, fontWeight: "700" }, groupCountLabel: { fontSize: 11 }, groupList: { gap: spacing.sm }, groupCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }, groupCardBody: { flex: 1, minWidth: 0 }, groupCardName: { fontSize: 16, fontWeight: "700" }, groupCardMeta: { fontSize: 13, marginTop: 3 }, groupIcon: { alignItems: "center", justifyContent: "center" }, listHint: { fontSize: 13, textAlign: "center" }, floatingButton: { position: "absolute", right: spacing.lg, bottom: spacing.lg, width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", elevation: 5, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, plus: { color: "#fff", fontSize: 30, fontWeight: "300", lineHeight: 32 }, backButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" }, backText: { fontWeight: "700", fontSize: 14 }, detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md }, detailTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }, memberPanel: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md }, memberCard: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, marginTop: spacing.sm }, panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md }, panelTitle: { fontSize: 18, fontWeight: "700" }, panelSubtitle: { fontSize: 13, marginTop: 3 }, emptyText: { textAlign: "center", padding: spacing.lg }, discoverCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }, metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }, discoverList: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.md }, modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }, modalBackdropDesktop: { justifyContent: "center", alignItems: "center" }, discoverModal: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, minHeight: "55%" }, discoverModalDesktop: { width: 520, maxWidth: "92%", maxHeight: "80%", borderRadius: radius.lg, borderWidth: 1 }, modalCard: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }, modalCardDesktop: { width: 500, maxWidth: "90%", borderRadius: radius.lg, borderWidth: 1 }, modalTitle: { fontSize: 18, fontWeight: "700" }, modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }, modalAction: { flex: 1 },
});