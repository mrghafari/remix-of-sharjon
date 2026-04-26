import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { toast } from "@/hooks/use-toast";

export type SmsRecipientMode = "owner" | "resident" | "both";
export type SmsProvider = "kavenegar" | "smsir" | "melipayamak";

export interface SmsSettings {
  id: string;
  building_id: string;
  active_provider: SmsProvider;
  kavenegar_api_key: string | null;
  kavenegar_sender: string | null;
  smsir_api_key: string | null;
  smsir_sender: string | null;
  melipayamak_username: string | null;
  melipayamak_password: string | null;
  melipayamak_sender: string | null;
  is_enabled: boolean;
  debt_report_recipient: SmsRecipientMode;
  payment_thanks_recipient: SmsRecipientMode;
  reservation_recipient: SmsRecipientMode;
  balance_reminder_recipient: SmsRecipientMode;
  debt_report_enabled: boolean;
  payment_thanks_enabled: boolean;
  reservation_enabled: boolean;
  balance_reminder_enabled: boolean;
  debt_auto_schedule_enabled: boolean;
  debt_auto_schedule_day: number;
  debt_auto_schedule_hour: number;
}

export interface SmsTemplate {
  id: string;
  building_id: string;
  template_key: string;
  title: string;
  body: string;
  is_active: boolean;
}

export interface SmsLog {
  id: string;
  building_id: string;
  template_key: string;
  recipient_phone: string;
  recipient_name: string | null;
  recipient_role: string | null;
  unit_id: string | null;
  message_body: string;
  provider: string;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export function useSmsSettings() {
  const { currentBuildingId } = useBuilding();
  return useQuery({
    queryKey: ["sms_settings", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return null;
      let { data, error } = await supabase
        .from("sms_settings")
        .select("*")
        .eq("building_id", currentBuildingId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: created, error: cErr } = await supabase
          .from("sms_settings")
          .insert({ building_id: currentBuildingId })
          .select()
          .single();
        if (cErr) throw cErr;
        data = created;
      }
      return data as SmsSettings;
    },
    enabled: !!currentBuildingId,
  });
}

export function useUpdateSmsSettings() {
  const qc = useQueryClient();
  const { currentBuildingId } = useBuilding();
  return useMutation({
    mutationFn: async (patch: Partial<SmsSettings>) => {
      if (!currentBuildingId) throw new Error("No building");
      const { error } = await supabase
        .from("sms_settings")
        .update(patch)
        .eq("building_id", currentBuildingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_settings", currentBuildingId] });
      toast({ title: "تنظیمات ذخیره شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
}

export function useSmsTemplates() {
  const { currentBuildingId } = useBuilding();
  return useQuery({
    queryKey: ["sms_templates", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("template_key");
      if (error) throw error;
      return (data ?? []) as SmsTemplate[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useUpdateSmsTemplate() {
  const qc = useQueryClient();
  const { currentBuildingId } = useBuilding();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SmsTemplate> }) => {
      const { error } = await supabase.from("sms_templates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_templates", currentBuildingId] });
      toast({ title: "قالب ذخیره شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
}

export function useSmsLogs(limit = 100) {
  const { currentBuildingId } = useBuilding();
  return useQuery({
    queryKey: ["sms_logs", currentBuildingId, limit],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("sent_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as SmsLog[];
    },
    enabled: !!currentBuildingId,
  });
}

export interface SendSmsRecipient {
  phone: string;
  name?: string;
  role?: "owner" | "resident";
  unit_id?: string;
  variables: Record<string, string | number>;
}

export async function sendSmsBatch(params: {
  building_id: string;
  template_key: string;
  recipients: SendSmsRecipient[];
}) {
  const { data, error } = await supabase.functions.invoke("send-sms", { body: params });
  if (error) throw error;
  return data;
}
