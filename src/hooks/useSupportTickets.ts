import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "answered" | "closed";
export type TicketCategory = "financial" | "technical" | "support" | "other";

export interface SupportTicket {
  id: string;
  building_id: string;
  created_by: string;
  creator_name: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  last_reply_at: string;
  last_reply_by_role: string;
  manager_read_at: string | null;
  admin_read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  building_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  urgent: "فوری",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "باز",
  in_progress: "در حال بررسی",
  answered: "پاسخ داده شده",
  closed: "بسته",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  financial: "مالی",
  technical: "فنی",
  support: "پشتیبانی",
  other: "سایر",
};

// List tickets — manager sees their building, super admin sees all
export function useSupportTickets(buildingId?: string, allBuildings = false) {
  return useQuery({
    queryKey: ["support_tickets", buildingId, allBuildings],
    queryFn: async () => {
      let q = supabase.from("support_tickets").select("*").order("last_reply_at", { ascending: false });
      if (!allBuildings && buildingId) q = q.eq("building_id", buildingId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SupportTicket[];
    },
    enabled: allBuildings || !!buildingId,
    refetchInterval: 30000,
  });
}

export function useTicketMessages(ticketId?: string) {
  return useQuery({
    queryKey: ["support_ticket_messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as SupportTicketMessage[];
    },
    enabled: !!ticketId,
    refetchInterval: 15000,
  });
}

// Unread count: tickets where last reply is from the OTHER side and not read
export function useUnreadTicketsCount(opts: { buildingId?: string; isSuperAdmin?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread_tickets_count", opts.buildingId, opts.isSuperAdmin, user?.id],
    queryFn: async () => {
      if (!user) return 0;
      let q = supabase.from("support_tickets").select("id, last_reply_by_role, last_reply_at, manager_read_at, admin_read_at, status, building_id");
      if (!opts.isSuperAdmin && opts.buildingId) q = q.eq("building_id", opts.buildingId);
      const { data, error } = await q;
      if (error) throw error;
      const otherRole = opts.isSuperAdmin ? "manager" : "super_admin";
      return (data || []).filter((t: any) => {
        if (t.status === "closed") return false;
        if (t.last_reply_by_role !== otherRole) return false;
        const readAt = opts.isSuperAdmin ? t.admin_read_at : t.manager_read_at;
        if (!readAt) return true;
        return new Date(t.last_reply_at).getTime() > new Date(readAt).getTime();
      }).length;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      building_id: string;
      created_by: string;
      creator_name: string;
      subject: string;
      description: string;
      priority: TicketPriority;
      category: TicketCategory;
    }) => {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({ ...payload, last_reply_by_role: "manager" })
        .select()
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["unread_tickets_count"] });
      toast.success("تیکت با موفقیت ثبت شد");
    },
    onError: (e: any) => toast.error("خطا در ثبت تیکت: " + e.message),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<SupportTicket, "status" | "priority" | "category">> }) => {
      const { error } = await supabase.from("support_tickets").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("تیکت بروزرسانی شد");
    },
    onError: (e: any) => toast.error("خطا: " + e.message),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("تیکت حذف شد");
    },
  });
}

export function useSendTicketMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ticket_id: string;
      building_id: string;
      sender_user_id: string;
      sender_name: string;
      sender_role: string;
      content: string;
      attachment_url?: string | null;
    }) => {
      const { error } = await supabase.from("support_ticket_messages").insert(payload);
      if (error) throw error;
      // update ticket meta
      const newStatus = payload.sender_role === "super_admin" ? "answered" : "in_progress";
      const nowIso = new Date().toISOString();
      const readField = payload.sender_role === "super_admin"
        ? { admin_read_at: nowIso }
        : { manager_read_at: nowIso };
      await supabase
        .from("support_tickets")
        .update({
          last_reply_at: nowIso,
          last_reply_by_role: payload.sender_role,
          status: newStatus,
          ...readField,
        })
        .eq("id", payload.ticket_id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["support_ticket_messages", vars.ticket_id] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["unread_tickets_count"] });
    },
    onError: (e: any) => toast.error("ارسال نشد: " + e.message),
  });
}

export function useMarkTicketRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, isAdmin }: { ticketId: string; isAdmin: boolean }) => {
      const field = isAdmin ? { admin_read_at: new Date().toISOString() } : { manager_read_at: new Date().toISOString() };
      const { error } = await supabase.from("support_tickets").update(field).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["unread_tickets_count"] });
    },
  });
}
