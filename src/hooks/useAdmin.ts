import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";


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

export interface AdminBuilding {
  id: string;
  name: string;
  address: string | null;
  total_units: number;
  manager_name: string | null;
  manager_email: string | null;
  created_at: string;
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

export function useIsSuperAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is_super_admin", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "super_admin",
      });
      return !!data;
    },
    enabled: !!userId,
  });
}

export function useAdminCustomers() {
  return useQuery({
    queryKey: ["admin_customers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc("get_admin_customers");
      if (error) throw error;
      // Filter out the current super admin from the list
      return ((data ?? []) as AdminCustomer[]).filter(c => c.user_id !== user?.id);
    },
  });
}

export function useAdminBuildings() {
  return useQuery({
    queryKey: ["admin_buildings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_buildings");
      if (error) throw error;
      return (data ?? []) as AdminBuilding[];
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

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin_buildings"] });
      toast({ title: "حذف شد", description: "مشتری با موفقیت حذف شد" });
    },
    onError: (err: Error) => {
      toast({ title: "خطا", description: err.message || "خطا در حذف مشتری", variant: "destructive" });
    },
  });
}
