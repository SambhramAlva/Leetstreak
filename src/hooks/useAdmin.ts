import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AdminAuditLog, AppAdmin, AppSetting, Group, Profile } from "@/types/database";

export type AdminResource = "profiles" | "groups" | "app_settings" | "admin_audit_logs";

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-app-admin", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_app_admin");
      if (error) throw error;
      return data === true;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useAdminDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [profiles, groups, admins, settings, audit] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("groups").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("app_admins").select("*").order("created_at", { ascending: false }),
        supabase.from("app_settings").select("*").order("key"),
        supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      const failure = [profiles, groups, admins, settings, audit].find((result) => result.error);
      if (failure?.error) throw failure.error;
      return {
        profiles: (profiles.data ?? []) as Profile[],
        groups: (groups.data ?? []) as Group[],
        admins: (admins.data ?? []) as AppAdmin[],
        settings: (settings.data ?? []) as AppSetting[],
        audit: (audit.data ?? []) as AdminAuditLog[],
      };
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useAdminActions() {
  const queryClient = useQueryClient();

  async function audit(action: string, tableName?: string, recordId?: string, metadata?: Record<string, unknown>) {
    const { error } = await supabase.rpc("admin_audit", {
      action_name: action,
      affected_table: tableName ?? null,
      affected_record: recordId ?? null,
      details: metadata ?? {},
    });
    if (error) throw error;
  }

  async function deleteRecord(table: "profiles" | "groups", id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    await audit("delete", table, id);
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function saveSetting(setting: Pick<AppSetting, "key" | "value" | "description">) {
    const { error } = await supabase.from("app_settings").upsert({ ...setting, updated_at: new Date().toISOString() });
    if (error) throw error;
    await audit("upsert", "app_settings", setting.key);
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  async function setAdmin(userId: string, enabled: boolean) {
    if (enabled) {
      const { error } = await supabase.from("app_admins").upsert({ user_id: userId });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("app_admins").delete().eq("user_id", userId);
      if (error) throw error;
    }
    await audit(enabled ? "grant_admin" : "revoke_admin", "app_admins", userId);
    await queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  return { audit, deleteRecord, saveSetting, setAdmin };
}