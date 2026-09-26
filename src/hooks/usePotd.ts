import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProblemOfTheDay } from "@/types/database";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function useTodaysPotd(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["potd", groupId, today()],
    queryFn: async () => {
      const { data: potd, error } = await supabase
        .from("problem_of_the_day")
        .select("*")
        .eq("group_id", groupId!)
        .eq("date", today())
        .maybeSingle();
      if (error) throw error;
      if (!potd) return { potd: null, solvedByUserIds: [] as string[] };

      const { data: solves } = await supabase.from("potd_solves").select("user_id").eq("potd_id", potd.id);
      return { potd: potd as ProblemOfTheDay, solvedByUserIds: (solves ?? []).map((s) => s.user_id) };
    },
    enabled: !!groupId,
  });

  const instanceId = useId();

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`potd-${groupId}-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "potd_solves" }, () => {
        queryClient.invalidateQueries({ queryKey: ["potd", groupId, today()] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return query;
}

export function useProposePotd(groupId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; titleSlug: string; url: string }) => {
      const { error } = await supabase.from("problem_of_the_day").insert({
        group_id: groupId!,
        date: today(),
        title: input.title,
        title_slug: input.titleSlug,
        url: input.url,
        proposed_by: userId!,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["potd", groupId, today()] }),
  });
}
