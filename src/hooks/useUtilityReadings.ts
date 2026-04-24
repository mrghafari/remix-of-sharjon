import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useToast } from "@/hooks/use-toast";

export interface UtilityReading {
  id: string;
  building_id: string;
  utility_type: string;
  reading_date: string;
  quantity: number;
  amount: number;
  description: string | null;
  created_at: string;
}

export function useUtilityReadings() {
  const { currentBuildingId } = useBuilding();
  return useQuery({
    queryKey: ["utility_readings", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("utility_readings" as any)
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("reading_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as UtilityReading[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useCreateUtilityReading() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (reading: Omit<UtilityReading, "id" | "created_at">) => {
      const { error } = await supabase
        .from("utility_readings" as any)
        .insert(reading as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility_readings"] });
      toast({ title: "موفق", description: "قرائت مصرف ثبت شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ثبت قرائت", variant: "destructive" });
    },
  });
}

export function useUpdateUtilityReading() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<UtilityReading, "id" | "created_at" | "building_id">> }) => {
      const { error } = await supabase
        .from("utility_readings" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility_readings"] });
      toast({ title: "موفق", description: "قرائت ویرایش شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ویرایش قرائت", variant: "destructive" });
    },
  });
}

export function useDeleteUtilityReading() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("utility_readings" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utility_readings"] });
      toast({ title: "موفق", description: "قرائت حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف قرائت", variant: "destructive" });
    },
  });
}
