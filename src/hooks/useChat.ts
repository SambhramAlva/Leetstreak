import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Message } from "@/types/database";

export function useChatMessages(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", groupId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const instanceId = useId();

  // Live updates via Supabase Realtime — no polling needed for chat.
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`messages-${groupId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          queryClient.setQueryData<Message[]>(["messages", groupId], (old: Message[] | undefined) => {
            const next = old ? [...old] : [];
            const incoming = payload.new as Message;
            if (next.some((m) => m.id === incoming.id)) return next;
            return [...next, incoming];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return query;
}

export function useSendMessage(groupId: string | undefined, userId: string | undefined) {
  return useMutation({
    mutationFn: async (input: { content: string; potdDate?: string | null }) => {
      const { error } = await supabase.from("messages").insert({
        group_id: groupId!,
        user_id: userId!,
        content: input.content,
        potd_date: input.potdDate ?? null,
      });
      if (error) throw error;
    },
    // No manual cache update needed on success — the realtime INSERT event
    // above appends it (works the same for the sender and everyone else).
  });
}
