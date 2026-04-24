import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UnitDocAccessBlock {
  id: string;
  building_id: string;
  unit_id: string;
  blocked_at: string;
  blocked_by: string | null;
}

export function useUnitDocumentAccessBlocks(buildingId?: string) {
  return useQuery({
    queryKey: ["unit_document_access_blocks", buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const { data, error } = await supabase
        .from("unit_document_access_blocks" as any)
        .select("*")
        .eq("building_id", buildingId);
      if (error) throw error;
      return (data || []) as unknown as UnitDocAccessBlock[];
    },
    enabled: !!buildingId,
  });
}

export function useToggleUnitDocumentAccess() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ buildingId, unitId, blocked }: { buildingId: string; unitId: string; blocked: boolean }) => {
      if (blocked) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("unit_document_access_blocks" as any)
          .insert({ building_id: buildingId, unit_id: unitId, blocked_by: user?.id || null } as any);
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("unit_document_access_blocks" as any)
          .delete()
          .eq("building_id", buildingId)
          .eq("unit_id", unitId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["unit_document_access_blocks"] });
      toast({ title: "موفق", description: vars.blocked ? "دسترسی واحد به اسناد قطع شد" : "دسترسی واحد به اسناد فعال شد" });
    },
    onError: (e: any) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
}
