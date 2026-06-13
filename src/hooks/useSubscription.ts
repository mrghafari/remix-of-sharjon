import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SubscriptionPlan {
  id: string;
  name: string;
  unit_quota: number;
  duration_days: number;
  price_rial: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface MySubscription {
  subscription_id: string | null;
  plan_id: string | null;
  plan_name: string | null;
  unit_quota: number | null;
  units_used: number;
  starts_at: string | null;
  expires_at: string | null;
  days_remaining: number;
  is_active: boolean;
}

export interface SubscriptionPayment {
  id: string;
  user_id: string;
  plan_id: string | null;
  amount_rial: number;
  gateway: string;
  authority: string | null;
  ref_id: string | null;
  status: string;
  payment_date: string | null;
  created_at: string;
}

export interface AdminSubscriptionRow {
  user_id: string;
  unit_quota: number;
  units_used: number;
  expires_at: string | null;
  days_remaining: number;
  is_active: boolean;
  total_paid: number;
}

export interface CompanyRevenue {
  total_revenue: number;
  total_payments: number;
  active_subscriptions: number;
  this_month_revenue: number;
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["my_subscription"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_subscription");
      if (error) throw error;
      const row = (data ?? [])[0] ?? null;
      return row as MySubscription | null;
    },
  });
}

export function useSubscriptionPlans(activeOnly = false) {
  return useQuery({
    queryKey: ["subscription_plans", activeOnly],
    queryFn: async () => {
      let q = supabase.from("subscription_plans").select("*").order("sort_order", { ascending: true });
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SubscriptionPlan[];
    },
  });
}

export function useMySubscriptionPayments() {
  return useQuery({
    queryKey: ["my_subscription_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SubscriptionPayment[];
    },
  });
}

export function useAdminSubscriptionOverview() {
  return useQuery({
    queryKey: ["admin_subscription_overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_subscription_overview");
      if (error) throw error;
      return (data ?? []) as AdminSubscriptionRow[];
    },
  });
}

export function useCompanyRevenue() {
  return useQuery({
    queryKey: ["company_revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_company_revenue");
      if (error) throw error;
      const row = (data ?? [])[0] ?? null;
      return row as CompanyRevenue | null;
    },
  });
}

export function useAllSubscriptionPayments() {
  return useQuery({
    queryKey: ["all_subscription_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SubscriptionPayment[];
    },
  });
}

export function usePlanMutations() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (p: Partial<SubscriptionPlan>) => {
      const { error } = await supabase.from("subscription_plans").insert([{
        name: p.name!,
        unit_quota: p.unit_quota!,
        duration_days: p.duration_days!,
        price_rial: p.price_rial!,
        description: p.description ?? null,
        is_active: p.is_active ?? true,
        sort_order: p.sort_order ?? 0,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription_plans"] });
      toast({ title: "پلن ایجاد شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SubscriptionPlan> & { id: string }) => {
      const { error } = await supabase.from("subscription_plans").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription_plans"] });
      toast({ title: "پلن ذخیره شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription_plans"] });
      toast({ title: "پلن حذف شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
  return { create, update, remove };
}

export function useInitSubscriptionPayment() {
  return useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke("subscription-payment-init", {
        body: { plan_id: planId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
      }
      return data;
    },
    onError: (e: Error) =>
      toast({ title: "خطا در شروع پرداخت", description: e.message, variant: "destructive" }),
  });
}

export function useManualGrantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, planId, unitQuota, durationDays }: {
      userId: string; planId?: string | null; unitQuota: number; durationDays: number;
    }) => {
      const expires = new Date(Date.now() + durationDays * 86400000).toISOString();
      const { error } = await supabase.from("customer_subscriptions").insert([{
        user_id: userId,
        plan_id: planId ?? null,
        unit_quota: unitQuota,
        starts_at: new Date().toISOString(),
        expires_at: expires,
        is_active: true,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_subscription_overview"] });
      toast({ title: "اشتراک اعطا شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
}
