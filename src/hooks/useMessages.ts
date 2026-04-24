import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface BuildingMessage {
  id: string;
  building_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  recipient_user_id: string | null;
  unit_id: string | null;
  subject: string | null;
  content: string;
  parent_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useMessages(buildingId?: string) {
  return useQuery({
    queryKey: ["building_messages", buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const { data, error } = await supabase
        .from("building_messages")
        .select("*")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BuildingMessage[];
    },
    enabled: !!buildingId,
    refetchInterval: 30000,
  });
}

export function useUnreadMessagesCount(buildingId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread_messages_count", buildingId, user?.id],
    queryFn: async () => {
      if (!buildingId || !user?.id) return 0;
      // Unread = is_read=false AND not sent by me AND (recipient is me OR recipient is null and I'm a manager)
      const { data, error } = await supabase
        .from("building_messages")
        .select("id, recipient_user_id, sender_user_id")
        .eq("building_id", buildingId)
        .eq("is_read", false);
      if (error) throw error;
      const filtered = (data || []).filter(
        (m) => m.sender_user_id !== user.id && (m.recipient_user_id === user.id || m.recipient_user_id === null)
      );
      return filtered.length;
    },
    enabled: !!buildingId && !!user?.id,
    refetchInterval: 30000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      building_id: string;
      sender_user_id: string;
      sender_name: string;
      sender_role: string;
      recipient_user_id?: string | null;
      unit_id?: string | null;
      subject?: string | null;
      content: string;
      parent_id?: string | null;
    }) => {
      const { error } = await supabase.from("building_messages").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["building_messages"] });
      qc.invalidateQueries({ queryKey: ["unread_messages_count"] });
      toast.success("پیام ارسال شد");
    },
    onError: (e: any) => toast.error("ارسال نشد: " + e.message),
  });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("building_messages").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["building_messages"] });
      qc.invalidateQueries({ queryKey: ["unread_messages_count"] });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("building_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["building_messages"] });
      qc.invalidateQueries({ queryKey: ["unread_messages_count"] });
      toast.success("پیام حذف شد");
    },
  });
}
