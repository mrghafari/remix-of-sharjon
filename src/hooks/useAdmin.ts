import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "./useAuth";

export interface AdminCustomer {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  subscription_plan: string;
  is_blocked: boolean;
  max_buildings: number;
  max_units_per_building: number;
  created_at: string;
  buildings_count: number;
  total_units: number;
}

export interface AdminStats {
  total_users: number;
  total_buildings: number;
  total_units: number;
  blocked_users: number;
  free_users: number;
  pro_users: number;
  enterprise_users: number;
}

export function useIsSuperAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is_super_admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "super_admin",
      });
      return !!data;
    },
    enabled: !!user,
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: ["admin_customers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_customers");
      if (error) throw error;
      return (data ?? []) as AdminCustomer[];
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      const row = (data as any)?.[0] ?? data;
      return row as AdminStats;
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: {
        subscription_plan?: string;
        is_blocked?: boolean;
        max_buildings?: number;
        max_units_per_building?: number;
      };
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      toast({ title: "موفق", description: "اطلاعات مشتری بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی", variant: "destructive" });
    },
  });
}
