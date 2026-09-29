import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius, spacing } from "@/theme/theme";
import { ErrorState, LoadingState, Screen } from "@/components/Shared";
import { useAdminActions, useAdminDashboard } from "@/hooks/useAdmin";
import { AppIcon, AppIconName } from "@/components/AppIcon";
import { useAlert } from "@/context/AlertContext";

type Section = "Overview" | "Users" | "Groups" | "Settings" | "Activity";
const sections: { key: Section; icon: AppIconName; badge?: (d: any) => string | number }[] = [
  { key: "Overview", icon: "analytics" },
  { key: "Users", icon: "user", badge: (d) => d.profiles.length },
  { key: "Groups", icon: "group", badge: (d) => d.groups.length },
  { key: "Settings", icon: "settings" },
  { key: "Activity", icon: "activity", badge: (d) => d.audit.length },
];

const PAGE_SIZE = 8;

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, colors }: any) {
  return (
    <View style={[sc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[sc.iconWrap, { backgroundColor: accent + "1A" }]}>
        <AppIcon name={icon} size={18} color={accent} strokeWidth={2.5} />
      </View>
      <Text style={[sc.value, { color: colors.text }]}>{value}</Text>
      <Text style={[sc.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={[sc.bar, { backgroundColor: colors.border }]}>
        <View style={[sc.barFill, { backgroundColor: accent, width: "100%" }]} />
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 130,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  value: { fontSize: 30, fontWeight: "900", fontFamily: fonts.display },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  bar: { height: 3, borderRadius: 99, marginTop: spacing.xs, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, opacity: 0.7 },
});

// ─── Badge chip ───────────────────────────────────────────────────────────────
function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[ch.chip, { backgroundColor: bg }]}>
      <Text style={[ch.text, { color }]}>{label}</Text>
    </View>
  );
}
const ch = StyleSheet.create({
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  text: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
});

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, colors }: any) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[sh.title, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[sh.sub, { color: colors.textMuted }]}>{subtitle}</Text>}
    </View>
  );
}
const sh = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", fontFamily: fonts.display },
  sub: { fontSize: 13, marginTop: 2 },
});

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, colors }: any) {
  return (
    <View style={[srch.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <AppIcon name="analytics" size={14} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search..."
        placeholderTextColor={colors.textMuted}
        style={[srch.input, { color: colors.text }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
      />
    </View>
  );
}
const srch = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: 200,
  },
  input: { flex: 1, fontSize: 13 },
});

// ─── Pager ────────────────────────────────────────────────────────────────────
function Pager({ page, hasNext, onChange, colors }: any) {
  return (
    <View style={[pg.row, { borderTopColor: colors.border }]}>
      <Text style={[pg.info, { color: colors.textMuted }]}>Page {page + 1}</Text>
      <View style={pg.btns}>
        <Pressable
          disabled={!page}
          onPress={() => onChange(page - 1)}
          style={[pg.btn, { borderColor: colors.border, opacity: page ? 1 : 0.4 },
            Platform.OS === "web" && ({ cursor: page ? "pointer" : "default" } as any)]}
        >
          <AppIcon name="down" size={12} color={colors.textMuted} />
          <Text style={[pg.btnText, { color: colors.text }]}>Prev</Text>
        </Pressable>
        <Pressable
          disabled={!hasNext}
          onPress={() => onChange(page + 1)}
          style={[pg.btn, { borderColor: colors.border, opacity: hasNext ? 1 : 0.4 },
            Platform.OS === "web" && ({ cursor: hasNext ? "pointer" : "default" } as any)]}
        >
          <Text style={[pg.btnText, { color: colors.text }]}>Next</Text>
          <AppIcon name="up" size={12} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}
const pg = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderTopWidth: 1 },
  info: { fontSize: 12 },
  btns: { flexDirection: "row", gap: spacing.sm },
  btn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5 },
  btnText: { fontSize: 12, fontWeight: "600" },
});

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ data, colors }: any) {
  const checks = [
    { label: "Role-based access active", ok: data.admins.length > 0 },
    { label: "Audit trail recording", ok: data.audit.length > 0 },
    { label: "Global settings configured", ok: data.settings.length > 0 },
  ];

  const recentActivity = data.audit.slice(0, 5);

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Stat row */}
      <View style={ov.statRow}>
        <StatCard label="Users" value={data.profiles.length} icon="user" accent={colors.primary} colors={colors} />
        <StatCard label="Groups" value={data.groups.length} icon="group" accent="#8B5CF6" colors={colors} />
        <StatCard label="Admins" value={data.admins.length} icon="admin" accent={colors.success} colors={colors} />
        <StatCard label="Audit events" value={data.audit.length} icon="activity" accent={colors.warning} colors={colors} />
      </View>

      <View style={ov.panels}>
        {/* Health check */}
        <View style={[ov.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={[ov.headerIcon, { backgroundColor: colors.success + "1A" }]}>
              <AppIcon name="check" size={14} color={colors.success} strokeWidth={2.5} />
            </View>
            <Text style={[ov.panelTitle, { color: colors.text }]}>System health</Text>
          </View>
          {checks.map((c) => (
            <View key={c.label} style={[ov.checkRow, { borderColor: colors.border }]}>
              <View style={[ov.dot, { backgroundColor: c.ok ? colors.success + "22" : colors.danger + "22" }]}>
                <AppIcon name={c.ok ? "check" : "close"} size={10} color={c.ok ? colors.success : colors.danger} strokeWidth={3} />
              </View>
              <Text style={[ov.checkLabel, { color: c.ok ? colors.text : colors.textMuted }]}>{c.label}</Text>
              <Chip label={c.ok ? "PASS" : "FAIL"} color={c.ok ? colors.success : colors.danger} bg={c.ok ? colors.success + "1A" : colors.danger + "1A"} />
            </View>
          ))}
        </View>

        {/* Recent activity */}
        <View style={[ov.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={[ov.headerIcon, { backgroundColor: colors.warning + "1A" }]}>
              <AppIcon name="activity" size={14} color={colors.warning} strokeWidth={2.5} />
            </View>
            <Text style={[ov.panelTitle, { color: colors.text }]}>Recent activity</Text>
          </View>
          {recentActivity.length === 0 && (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>No audit events yet.</Text>
          )}
          {recentActivity.map((log: any) => (
            <View key={log.id} style={[ov.logRow, { borderColor: colors.border }]}>
              <View style={[ov.logDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[ov.logAction, { color: colors.text }]}>
                  {log.action}{log.table_name ? ` · ${log.table_name}` : ""}
                </Text>
                <Text style={[ov.logMeta, { color: colors.textMuted }]}>
                  {new Date(log.created_at).toLocaleString()} · {log.actor_id.slice(0, 8)}…
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
const ov = StyleSheet.create({
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  panels: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  panel: { flex: 1, minWidth: 260, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg },
  panelTitle: { fontSize: 16, fontWeight: "800", fontFamily: fonts.display },
  headerIcon: { width: 30, height: 30, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  dot: { width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  checkLabel: { flex: 1, fontSize: 13 },
  logRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  logDot: { width: 7, height: 7, borderRadius: 99, marginTop: 5 },
  logAction: { fontSize: 13, fontWeight: "600" },
  logMeta: { fontSize: 11, marginTop: 2 },
});

// ─── Users ────────────────────────────────────────────────────────────────────
function Users({ data, colors, admins, onToggleAdmin, onDelete }: any) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => data.filter((p: any) => `${p.username} ${p.display_name ?? ""} ${p.leetcode_username ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  );

  return (
    <View style={{ gap: spacing.md }}>
      <View style={usr.toolbar}>
        <SectionHeader
          title="User directory"
          subtitle={`${filtered.length} of ${data.length} users`}
          colors={colors}
        />
        <SearchBar value={search} onChange={(v: string) => { setSearch(v); setPage(0); }} colors={colors} />
      </View>

      <View style={[usr.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={[usr.thead, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {["User", "LeetCode", "Joined", "Role", ""].map((h) => (
            <Text key={h} style={[usr.th, { color: colors.textMuted, flex: h === "" ? 0.4 : 1 }]}>{h}</Text>
          ))}
        </View>

        {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((profile: any, idx: number) => {
          const isAdmin = admins.has(profile.id);
          return (
            <View key={profile.id} style={[usr.row, { borderColor: colors.border, backgroundColor: idx % 2 === 0 ? "transparent" : colors.background + "60" }]}>
              {/* User */}
              <View style={[usr.userCell, { flex: 1 }]}>
                <View style={[usr.avatar, { backgroundColor: isAdmin ? colors.primary : "#8B5CF6" }]}>
                  <Text style={usr.avatarLetter}>{(profile.username[0] ?? "U").toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[usr.name, { color: colors.text }]}>{profile.display_name || profile.username}</Text>
                  <Text style={[usr.sub, { color: colors.textMuted }]}>@{profile.username}</Text>
                </View>
              </View>
              {/* LeetCode */}
              <View style={{ flex: 1 }}>
                {profile.leetcode_username ? (
                  <Chip label={`@${profile.leetcode_username}`} color={colors.primary} bg={colors.primary + "18"} />
                ) : (
                  <Text style={[usr.sub, { color: colors.textMuted }]}>Not connected</Text>
                )}
              </View>
              {/* Joined */}
              <Text style={[usr.sub, { color: colors.textMuted, flex: 1 }]}>
                {new Date(profile.created_at).toLocaleDateString()}
              </Text>
              {/* Role toggle */}
              <Pressable
                onPress={() => onToggleAdmin(profile.id, !isAdmin)}
                style={[usr.roleBtn, { borderColor: isAdmin ? colors.primary : colors.border },
                  Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
              >
                <AppIcon name={isAdmin ? "admin" : "user"} size={11} color={isAdmin ? colors.primary : colors.textMuted} />
                <Text style={[usr.roleTxt, { color: isAdmin ? colors.primary : colors.textMuted }]}>
                  {isAdmin ? "Admin" : "Member"}
                </Text>
              </Pressable>
              {/* Delete */}
              <Pressable
                onPress={() => onDelete("profiles", profile.id, profile.username)}
                style={[usr.deleteBtn, { backgroundColor: colors.danger + "18" },
                  Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
              >
                <AppIcon name="close" size={12} color={colors.danger} strokeWidth={2.5} />
              </Pressable>
            </View>
          );
        })}
        <Pager page={page} hasNext={(page + 1) * PAGE_SIZE < filtered.length} onChange={setPage} colors={colors} />
      </View>
    </View>
  );
}
const usr = StyleSheet.create({
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, flexWrap: "wrap" },
  table: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  thead: { flexDirection: "row", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  th: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderTopWidth: StyleSheet.hairlineWidth },
  userCell: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: radius.full, justifyContent: "center", alignItems: "center" },
  avatarLetter: { color: "#fff", fontWeight: "900", fontSize: 13 },
  name: { fontSize: 13, fontWeight: "700" },
  sub: { fontSize: 11, marginTop: 1 },
  roleBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  roleTxt: { fontSize: 11, fontWeight: "700" },
  deleteBtn: { width: 28, height: 28, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
});

// ─── Groups ───────────────────────────────────────────────────────────────────
function Groups({ data, colors, onDelete }: any) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => data.filter((g: any) => `${g.name} ${g.invite_code}`.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  );

  return (
    <View style={{ gap: spacing.md }}>
      <View style={usr.toolbar}>
        <SectionHeader title="Group registry" subtitle={`${filtered.length} of ${data.length} groups`} colors={colors} />
        <SearchBar value={search} onChange={(v: string) => { setSearch(v); setPage(0); }} colors={colors} />
      </View>

      <View style={{ gap: spacing.sm }}>
        {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((group: any) => (
          <View key={group.id} style={[grp.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[grp.accent, { backgroundColor: "#8B5CF6" }]} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Text style={[grp.name, { color: colors.text }]}>{group.name}</Text>
                <Chip label={group.invite_code} color={colors.primary} bg={colors.primary + "18"} />
              </View>
              <Text style={[grp.meta, { color: colors.textMuted }]}>
                Created {new Date(group.created_at).toLocaleDateString()} · Owner {group.created_by.slice(0, 8)}…
              </Text>
            </View>
            <Pressable
              onPress={() => onDelete("groups", group.id, group.name)}
              style={[grp.deleteBtn, { backgroundColor: colors.danger + "18" },
                Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
            >
              <AppIcon name="close" size={13} color={colors.danger} strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}
      </View>
      {filtered.length > PAGE_SIZE && (
        <View style={[{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg }]}>
          <Pager page={page} hasNext={(page + 1) * PAGE_SIZE < filtered.length} onChange={setPage} colors={colors} />
        </View>
      )}
    </View>
  );
}
const grp = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, overflow: "hidden" },
  accent: { width: 4, height: "100%", position: "absolute", left: 0, top: 0, bottom: 0, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  name: { fontSize: 15, fontWeight: "700", fontFamily: fonts.display },
  meta: { fontSize: 12 },
  deleteBtn: { width: 32, height: 32, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
});

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsPanel({ settings, colors, onSave }: any) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const { showAlert } = useAlert();

  function handleSave() {
    try {
      onSave({ key, value: JSON.parse(value), description: null });
      setKey("");
      setValue("");
      showAlert({ type: "success", title: "Setting saved", message: `"${key}" was saved successfully.` });
    } catch {
      showAlert({ type: "error", title: "Invalid JSON", message: "Enter a valid JSON value, e.g. {\"enabled\":true}" });
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <SectionHeader title="App settings" subtitle="Persisted configuration managed through admin policy" colors={colors} />
      <View style={{ gap: spacing.sm }}>
        {settings.map((s: any) => (
          <View key={s.key} style={[set.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[set.keyBadge, { backgroundColor: colors.primary + "18" }]}>
              <AppIcon name="settings" size={13} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[set.key, { color: colors.text }]}>{s.key}</Text>
              <Text style={[set.val, { color: colors.textMuted }]}>{JSON.stringify(s.value)}</Text>
            </View>
            <Chip label="ACTIVE" color={colors.success} bg={colors.success + "18"} />
          </View>
        ))}
        {settings.length === 0 && (
          <View style={[set.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted }}>No settings configured yet</Text>
          </View>
        )}
      </View>

      {/* Add setting */}
      <View style={[set.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[set.formTitle, { color: colors.text }]}>Add / update setting</Text>
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder="Setting key"
          placeholderTextColor={colors.textMuted}
          style={[set.input, { color: colors.text, borderColor: colors.border },
            Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
        />
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder='JSON value — e.g. {"enabled":true}'
          placeholderTextColor={colors.textMuted}
          style={[set.input, { color: colors.text, borderColor: colors.border },
            Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
        />
        <Pressable
          onPress={handleSave}
          style={[set.saveBtn, { backgroundColor: colors.primary },
            Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
        >
          <AppIcon name="check" size={14} color="#fff" strokeWidth={2.5} />
          <Text style={set.saveTxt}>Save setting</Text>
        </Pressable>
      </View>
    </View>
  );
}
const set = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  keyBadge: { width: 36, height: 36, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  key: { fontSize: 13, fontWeight: "700" },
  val: { fontSize: 11, marginTop: 2 },
  empty: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  form: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  formTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, fontSize: 13 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

// ─── Activity ─────────────────────────────────────────────────────────────────
const ACTION_COLOR: Record<string, string> = {
  delete: "#EF4743",
  grant_admin: "#22C55E",
  revoke_admin: "#F59E0B",
  upsert: "#8B5CF6",
};

function ActivityLog({ logs, colors }: any) {
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader
        title="Audit activity"
        subtitle={`${logs.length} recorded events`}
        colors={colors}
      />
      <View style={[act.timeline, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {logs.length === 0 && (
          <View style={{ padding: spacing.lg, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted }}>No audit events yet</Text>
          </View>
        )}
        {logs.map((log: any, idx: number) => {
          const accent = ACTION_COLOR[log.action] ?? colors.primary;
          return (
            <View key={log.id} style={[act.row, { borderColor: colors.border }]}>
              {/* Timeline line */}
              <View style={act.dotCol}>
                <View style={[act.dot, { backgroundColor: accent }]} />
                {idx < logs.length - 1 && <View style={[act.line, { backgroundColor: colors.border }]} />}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" }}>
                  <Chip label={log.action.toUpperCase()} color={accent} bg={accent + "1A"} />
                  {log.table_name && (
                    <Text style={[act.table, { color: colors.textMuted }]}>{log.table_name}</Text>
                  )}
                </View>
                <Text style={[act.meta, { color: colors.textMuted }]}>
                  {new Date(log.created_at).toLocaleString()} · actor: {log.actor_id.slice(0, 8)}…
                  {log.record_id ? ` · record: ${log.record_id.slice(0, 8)}…` : ""}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const act = StyleSheet.create({
  timeline: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  row: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  dotCol: { alignItems: "center", paddingTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 99 },
  line: { width: 2, flex: 1, marginTop: 2 },
  table: { fontSize: 11, fontWeight: "600" },
  meta: { fontSize: 11 },
});

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function AdminDashboardScreen() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [section, setSection] = useState<Section>("Overview");
  const { data, isLoading, isError, refetch, isFetching } = useAdminDashboard(true);
  const { deleteRecord, setAdmin, saveSetting } = useAdminActions();

  const admins = new Set((data?.admins ?? []).map((a: any) => a.user_id));

  function askDelete(table: "profiles" | "groups", id: string, label: string) {
    showAlert({
      type: "error",
      title: "Delete record?",
      message: `Permanently remove "${label}" and all related records? This cannot be undone.`,
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteRecord(table, id).catch((err: any) =>
              showAlert({ type: "error", title: "Delete failed", message: err.message })
            ),
        },
      ],
    });
  }

  if (isLoading) return <Screen><LoadingState label="Loading control center..." /></Screen>;
  if (isError || !data) return <Screen><ErrorState message="Couldn't load the admin control center." onRetry={refetch} /></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={dash.content}>
        {/* ── Header ─────────────────────────────────────── */}
        <View style={dash.header}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View style={[dash.badgeWrap, { backgroundColor: colors.primary + "1A" }]}>
                <AppIcon name="admin" size={16} color={colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={[dash.eyebrow, { color: colors.primary }]}>LEETSTREAK / ADMIN</Text>
            </View>
            <Text style={[dash.title, { color: colors.text }]}>Control center</Text>
            <Text style={[dash.subtitle, { color: colors.textMuted }]}>
              Operations, access management, data, and audit history.
            </Text>
          </View>

          <Pressable
            onPress={() => refetch()}
            style={[dash.refreshBtn, { borderColor: colors.border, backgroundColor: colors.card },
              Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
          >
            <AppIcon name="activity" size={13} color={isFetching ? colors.primary : colors.textMuted} />
            <Text style={[dash.refreshTxt, { color: isFetching ? colors.primary : colors.text }]}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </Text>
          </Pressable>
        </View>

        {/* ── Body ───────────────────────────────────────── */}
        <View style={dash.body}>
          {/* Sidebar */}
          <View style={[dash.sidebar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[dash.sideLabel, { color: colors.textMuted }]}>WORKSPACE</Text>
            {sections.map((s) => {
              const active = section === s.key;
              const badge = s.badge?.(data);
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setSection(s.key)}
                  style={[
                    dash.navItem,
                    active && { backgroundColor: colors.primary },
                    !active && Platform.OS === "web" && ({ cursor: "pointer" } as any),
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
                    <AppIcon name={s.icon} size={14} color={active ? "#fff" : colors.textMuted} strokeWidth={2} />
                    <Text style={[dash.navText, { color: active ? "#fff" : colors.text }]}>{s.key}</Text>
                  </View>
                  {badge !== undefined && (
                    <View style={[dash.navBadge, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.border }]}>
                      <Text style={[dash.navBadgeTxt, { color: active ? "#fff" : colors.textMuted }]}>{badge}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* Security note */}
            <View style={[dash.securityCard, { borderColor: colors.border, backgroundColor: colors.primary + "0A" }]}>
              <AppIcon name="admin" size={13} color={colors.primary} />
              <View>
                <Text style={[dash.secTitle, { color: colors.primary }]}>Secure mode</Text>
                <Text style={[dash.secNote, { color: colors.textMuted }]}>RLS enforced. All writes are audit-logged.</Text>
              </View>
            </View>
          </View>

          {/* Main content */}
          <View style={dash.main}>
            {section === "Overview" && <Overview data={data} colors={colors} />}
            {section === "Users" && (
              <Users
                data={data.profiles}
                colors={colors}
                admins={admins}
                onToggleAdmin={setAdmin}
                onDelete={askDelete}
              />
            )}
            {section === "Groups" && (
              <Groups data={data.groups} colors={colors} onDelete={askDelete} />
            )}
            {section === "Settings" && (
              <SettingsPanel settings={data.settings} colors={colors} onSave={saveSetting} />
            )}
            {section === "Activity" && (
              <ActivityLog logs={data.audit} colors={colors} />
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const dash = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl + 16 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, flexWrap: "wrap" },
  badgeWrap: { width: 32, height: 32, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { fontSize: 32, fontWeight: "900", fontFamily: fonts.display, marginTop: spacing.xs },
  subtitle: { fontSize: 13, marginTop: spacing.xs },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  refreshTxt: { fontSize: 13, fontWeight: "600" },
  body: { flexDirection: "row", alignItems: "flex-start", gap: spacing.lg },
  sidebar: { width: 200, borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm, gap: 2 },
  sideLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.xs },
  navItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm + 2, borderRadius: radius.md },
  navText: { fontSize: 13, fontWeight: "700" },
  navBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, minWidth: 22, alignItems: "center" },
  navBadgeTxt: { fontSize: 10, fontWeight: "700" },
  securityCard: { flexDirection: "row", gap: spacing.xs, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md, alignItems: "flex-start" },
  secTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  secNote: { fontSize: 10, marginTop: 1, lineHeight: 14 },
  main: { flex: 1, gap: spacing.md },
});