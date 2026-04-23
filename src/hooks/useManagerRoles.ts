import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBuilding } from "@/contexts/BuildingContext";

export interface ManagerRole {
  id: string;
  building_id: string;
  name: string;
  label: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useManagerRoles() {
  const { currentBuildingId } = useBuilding();

  return useQuery({
    queryKey: ["manager_roles", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("manager_roles")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ManagerRole[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useCreateManagerRole() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();

  return useMutation({
    mutationFn: async ({ label }: { label: string }) => {
      if (!currentBuildingId) throw new Error("ساختمانی انتخاب نشده");
      const name = `custom_${Date.now()}`;
      const { data: existing } = await supabase
        .from("manager_roles")
        .select("sort_order")
        .eq("building_id", currentBuildingId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from("manager_roles")
        .insert({
          building_id: currentBuildingId,
          name,
          label,
          is_system: false,
          sort_order: nextOrder,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager_roles"] });
      toast.success("نقش جدید اضافه شد");
    },
    onError: (e: any) => toast.error("خطا: " + e.message),
  });
}

export function useDeleteManagerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manager_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager_roles"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success("نقش حذف شد");
    },
    onError: (e: any) => toast.error("خطا: " + e.message),
  });
}
