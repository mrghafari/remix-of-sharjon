import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ModulePersonType = "owner" | "resident" | "both";
export type ModuleKey = "all_expenses" | "fund_balances" | "unit_balance";

export const MODULES: { key: ModuleKey; label: string }[] = [
  { key: "all_expenses", label: "همه هزینه‌های ساختمان" },
  { key: "fund_balances", label: "موجودی صندوق‌ها" },
  { key: "unit_balance", label: "مانده حساب واحد" },
];

export interface UnitModuleAccessRow {
  id: string;
  building_id: string;
  unit_id: string;
  person_type: ModulePersonType;
  module_key: ModuleKey;
  granted_at: string;
}

export function useUnitModuleAccessRows(buildingId?: string) {
  return useQuery({
    queryKey: ["unit_module_access", buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const { data, error } = await supabase
        .from("unit_module_access" as any)
        .select("*")
        .eq("building_id", buildingId);
      if (error) throw error;
      return (data || []) as unknown as UnitModuleAccessRow[];
    },
    enabled: !!buildingId,
  });
}

export function useToggleUnitModuleAccess() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      buildingId,
      unitId,
      personType,
      moduleKey,
      granted,
    }: {
      buildingId: string;
      unitId: string;
      personType: ModulePersonType;
      moduleKey: ModuleKey;
      granted: boolean;
    }) => {
      if (granted) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("unit_module_access" as any)
          .insert({
            building_id: buildingId,
            unit_id: unitId,
            person_type: personType,
            module_key: moduleKey,
            granted_by: user?.id || null,
          } as any);
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("unit_module_access" as any)
          .delete()
          .eq("building_id", buildingId)
          .eq("unit_id", unitId)
          .eq("person_type", personType)
          .eq("module_key", moduleKey);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unit_module_access"] });
      qc.invalidateQueries({ queryKey: ["unit_module_access_check"] });
      toast({ title: "موفق", description: "تنظیمات دسترسی بروزرسانی شد" });
    },
    onError: (e: any) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
}

/** Resident-side: returns the granted module keys for this unit + active role. */
export function useMyUnitModules(buildingId?: string, unitId?: string, activeRole?: "owner" | "resident") {
  return useQuery({
    queryKey: ["unit_module_access_check", buildingId, unitId, activeRole],
    queryFn: async () => {
      if (!buildingId || !unitId || !activeRole) return [] as ModuleKey[];
      const { data, error } = await supabase
        .from("unit_module_access" as any)
        .select("module_key, person_type")
        .eq("building_id", buildingId)
        .eq("unit_id", unitId)
        .in("person_type", [activeRole, "both"]);
      if (error) throw error;
      const set = new Set<ModuleKey>();
      (data || []).forEach((r: any) => set.add(r.module_key as ModuleKey));
      return Array.from(set);
    },
    enabled: !!buildingId && !!unitId && !!activeRole,
  });
}
