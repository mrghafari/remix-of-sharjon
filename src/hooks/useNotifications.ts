import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessagesCount } from "./useMessages";

/**
 * Aggregates unread/pending counts across announcements, polls, reservations and messages.
 * - announcements: items not yet in notification_reads for this user
 * - polls: active polls user hasn't voted on
 * - reservations (manager only): pending requests count
 * - messages: from useMessages
 */
export function useNotifications(buildingId?: string, isManager: boolean = false) {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: messagesUnread = 0 } = useUnreadMessagesCount(buildingId);

  const { data: announcementsData } = useQuery({
    queryKey: ["notif_announcements", buildingId, userId],
    queryFn: async () => {
      if (!buildingId || !userId) return { items: [], unread: 0 };
      const [{ data: anns }, { data: reads }] = await Promise.all([
        supabase
          .from("building_announcements")
          .select("id, title, content, created_at, is_pinned")
          .eq("building_id", buildingId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", userId)
          .eq("building_id", buildingId)
          .eq("notification_type", "announcement"),
      ]);
      const readSet = new Set((reads || []).map((r) => r.notification_id));
      const items = (anns || []).map((a) => ({ ...a, isRead: readSet.has(a.id) }));
      return { items, unread: items.filter((i) => !i.isRead).length };
    },
    enabled: !!buildingId && !!userId,
    refetchInterval: 30000,
  });

  const { data: pollsData } = useQuery({
    queryKey: ["notif_polls", buildingId, userId],
    queryFn: async () => {
      if (!buildingId || !userId) return { items: [], unread: 0 };
      const { data: polls } = await supabase
        .from("building_polls")
        .select("id, question, created_at, is_active")
        .eq("building_id", buildingId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      // Get current voter hashes for these polls
      const items: any[] = [];
      let unread = 0;
      for (const p of polls || []) {
        const { data: hashRes } = await supabase.rpc("get_voter_hash", { _poll_id: p.id });
        const { data: votes } = await supabase
          .from("building_poll_votes")
          .select("id")
          .eq("poll_id", p.id)
          .eq("voter_hash", hashRes as string)
          .maybeSingle();
        const voted = !!votes;
        items.push({ ...p, voted });
        if (!voted) unread++;
      }
      return { items, unread };
    },
    enabled: !!buildingId && !!userId,
    refetchInterval: 60000,
  });

  const { data: reservationsData } = useQuery({
    queryKey: ["notif_reservations", buildingId, userId, isManager],
    queryFn: async () => {
      if (!buildingId || !userId) return { items: [], unread: 0 };
      if (isManager) {
        const { data } = await supabase
          .from("reservations")
          .select("id, requester_name, reservation_date, start_time, end_time, status")
          .eq("building_id", buildingId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20);
        return { items: data || [], unread: (data || []).length };
      }
      // resident: their own recently reviewed
      const { data } = await supabase
        .from("reservations")
        .select("id, requester_name, reservation_date, start_time, end_time, status, reviewed_at")
        .eq("building_id", buildingId)
        .eq("requester_user_id", userId)
        .in("status", ["approved", "rejected"])
        .order("reviewed_at", { ascending: false })
        .limit(10);
      const { data: reads } = await supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", userId)
        .eq("building_id", buildingId)
        .eq("notification_type", "reservation");
      const readSet = new Set((reads || []).map((r) => r.notification_id));
      const items = (data || []).map((r) => ({ ...r, isRead: readSet.has(r.id) }));
      return { items, unread: items.filter((i) => !i.isRead).length };
    },
    enabled: !!buildingId && !!userId,
    refetchInterval: 30000,
  });

  const announcements = announcementsData || { items: [], unread: 0 };
  const polls = pollsData || { items: [], unread: 0 };
  const reservations = reservationsData || { items: [], unread: 0 };

  const total = announcements.unread + polls.unread + reservations.unread + messagesUnread;

  return { announcements, polls, reservations, messagesUnread, total };
}

export async function markNotificationRead(
  buildingId: string,
  userId: string,
  type: "announcement" | "poll" | "reservation",
  notificationId: string
) {
  await supabase.from("notification_reads").upsert(
    { user_id: userId, building_id: buildingId, notification_type: type, notification_id: notificationId },
    { onConflict: "user_id,notification_type,notification_id" }
  );
}
