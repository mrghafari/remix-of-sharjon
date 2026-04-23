import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBuilding } from "@/contexts/BuildingContext";

export interface Unit {
  id: string;
  unit_number: string;
  owner_name: string;
  phone: string | null;
  area: number | null;
  floor: number | null;
  is_occupied: boolean;
  resident_count: number | null;
  resident_name: string | null;
  resident_phone: string | null;
  landline_phone: string | null;
  late_penalty_exempt: boolean;
  building_id: string;
  created_at: string;
  updated_at: string;
}

export type CreateUnitData = Omit<Unit, "id" | "created_at" | "updated_at" | "building_id">;
export type UpdateUnitData = Partial<CreateUnitData> & { id: string };

export function useUnits() {
  const { currentBuildingId } = useBuilding();
  
  return useQuery({
    queryKey: ["units", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("unit_number", { ascending: true });
      
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();
  
  return useMutation({
    mutationFn: async (unit: Omit<CreateUnitData, "building_id">) => {
      const { data, error } = await supabase
        .from("units")
        .insert({ ...unit, building_id: currentBuildingId! })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "موفق", description: "واحد با موفقیت اضافه شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در افزودن واحد", variant: "destructive" });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...unit }: UpdateUnitData) => {
      const { data, error } = await supabase
        .from("units")
        .update(unit)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "موفق", description: "واحد با موفقیت بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی واحد", variant: "destructive" });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "حذف شد", description: "واحد با موفقیت حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف واحد", variant: "destructive" });
    },
  });
}
