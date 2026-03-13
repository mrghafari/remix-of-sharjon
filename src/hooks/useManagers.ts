import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBuilding } from "@/contexts/BuildingContext";

export interface Manager {
  id: string;
  unit_id: string | null;
  role_type: "owner" | "resident" | "external";
  mobile: string | null;
  email: string | null;
  external_name: string | null;
  start_date: string;
  end_date: string | null;
  charge_discount_percent: number;
  extra_charge_discount_percent: number;
  is_active: boolean;
  building_id: string;
  created_at: string;
  updated_at: string;
  unit?: {
    id: string;
    unit_number: string;
    owner_name: string;
    resident_name: string | null;
    phone: string | null;
    resident_phone: string | null;
  };
}

export interface ManagerInsert {
  unit_id?: string | null;
  role_type: "owner" | "resident" | "external";
  mobile?: string;
  email?: string;
  external_name?: string;
  start_date: string;
  end_date?: string;
  charge_discount_percent: number;
  extra_charge_discount_percent: number;
  is_active?: boolean;
}

export function useManagers() {
  const { currentBuildingId } = useBuilding();
  
  return useQuery({
    queryKey: ["managers", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("managers")
        .select(`
          *,
          unit:units(id, unit_number, owner_name, resident_name, phone, resident_phone)
        `)
        .eq("building_id", currentBuildingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Manager[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useActiveManager() {
  const { currentBuildingId } = useBuilding();
  
  return useQuery({
    queryKey: ["managers", "active", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("managers")
        .select(`
          *,
          unit:units(id, unit_number, owner_name, resident_name, phone, resident_phone)
        `)
        .eq("building_id", currentBuildingId)
        .eq("is_active", true)
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("start_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as Manager | null;
    },
    enabled: !!currentBuildingId,
  });
}

export function useCreateManager() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();

  return useMutation({
    mutationFn: async (manager: ManagerInsert) => {
      // Deactivate current active manager if new one is active
      if (manager.is_active !== false) {
        await supabase
          .from("managers")
          .update({ is_active: false })
          .eq("building_id", currentBuildingId!)
          .eq("is_active", true);
      }

      const { data, error } = await supabase
        .from("managers")
        .insert({ ...manager, building_id: currentBuildingId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success("مدیر با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error("خطا در ثبت مدیر: " + error.message);
    },
  });
}

export function useUpdateManager() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ManagerInsert> & { id: string }) => {
      // If activating this manager, deactivate others first
      if (updates.is_active === true && currentBuildingId) {
        await supabase
          .from("managers")
          .update({ is_active: false })
          .eq("building_id", currentBuildingId)
          .neq("id", id)
          .eq("is_active", true);
      }

      const { data, error } = await supabase
        .from("managers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success("مدیر با موفقیت به‌روزرسانی شد");
    },
    onError: (error) => {
      toast.error("خطا در به‌روزرسانی مدیر: " + error.message);
    },
  });
}

export function useDeleteManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("managers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success("مدیر با موفقیت حذف شد");
    },
    onError: (error) => {
      toast.error("خطا در حذف مدیر: " + error.message);
    },
  });
}
