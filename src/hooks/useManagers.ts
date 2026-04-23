import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBuilding } from "@/contexts/BuildingContext";

export interface Manager {
  id: string;
  unit_id: string | null;
  role_id: string | null;
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
  role?: {
    id: string;
    name: string;
    label: string;
    is_system: boolean;
    sort_order: number;
  } | null;
}

export interface ManagerInsert {
  unit_id?: string | null;
  role_id?: string | null;
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
          unit:units(id, unit_number, owner_name, resident_name, phone, resident_phone),
          role:manager_roles(id, name, label, is_system, sort_order)
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
          unit:units(id, unit_number, owner_name, resident_name, phone, resident_phone),
          role:manager_roles(id, name, label, is_system, sort_order)
        `)
        .eq("building_id", currentBuildingId)
        .eq("is_active", true)
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

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
      // Check duplicate person within the same role
      if (manager.unit_id && manager.role_id) {
        const { data: existing } = await supabase
          .from("managers")
          .select("id")
          .eq("building_id", currentBuildingId!)
          .eq("unit_id", manager.unit_id)
          .eq("role_id", manager.role_id)
          .eq("is_active", true)
          .limit(1);
        if (existing && existing.length > 0) {
          throw new Error("این شخص در حال حاضر در همین نقش به عنوان مدیر فعال ثبت شده است");
        }
      }
      if (manager.role_type === "external" && manager.external_name && manager.role_id) {
        const { data: existing } = await supabase
          .from("managers")
          .select("id")
          .eq("building_id", currentBuildingId!)
          .eq("external_name", manager.external_name)
          .eq("role_id", manager.role_id)
          .eq("is_active", true)
          .limit(1);
        if (existing && existing.length > 0) {
          throw new Error("این شخص در حال حاضر در همین نقش به عنوان مدیر فعال ثبت شده است");
        }
      }

      // Per-role single active: deactivate other active managers in the same role
      if (manager.is_active !== false && manager.role_id) {
        await supabase
          .from("managers")
          .update({ is_active: false, end_date: new Date().toISOString().split("T")[0] })
          .eq("building_id", currentBuildingId!)
          .eq("role_id", manager.role_id)
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
      // If activating, deactivate others in the same role
      if (updates.is_active === true && currentBuildingId && updates.role_id) {
        await supabase
          .from("managers")
          .update({ is_active: false, end_date: new Date().toISOString().split("T")[0] })
          .eq("building_id", currentBuildingId)
          .eq("role_id", updates.role_id)
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

/** End the tenure of a manager (without picking successor yet). */
export function useEndManagerTenure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, end_date }: { id: string; end_date?: string }) => {
      const today = end_date || new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("managers")
        .update({ is_active: false, end_date: today })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success("دوره مدیریت پایان یافت");
    },
    onError: (e: any) => toast.error("خطا: " + e.message),
  });
}

/** Transfer a role to a successor (existing manager record). */
export function useTransferManagement() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();

  return useMutation({
    mutationFn: async ({
      role_id,
      new_manager_id,
      effective_date,
    }: {
      role_id: string;
      new_manager_id: string;
      effective_date?: string;
    }) => {
      if (!currentBuildingId) throw new Error("ساختمان انتخاب نشده");
      const today = effective_date || new Date().toISOString().split("T")[0];

      await supabase
        .from("managers")
        .update({ is_active: false, end_date: today })
        .eq("building_id", currentBuildingId)
        .eq("role_id", role_id)
        .eq("is_active", true)
        .neq("id", new_manager_id);

      const { error } = await supabase
        .from("managers")
        .update({ is_active: true, role_id, start_date: today, end_date: null })
        .eq("id", new_manager_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success("مدیریت با موفقیت منتقل شد");
    },
    onError: (e: any) => toast.error("خطا در انتقال: " + e.message),
  });
}

