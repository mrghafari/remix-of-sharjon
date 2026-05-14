import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type DocAccessPersonType = "owner" | "resident" | "both";

export interface UnitDocAccessBlock {
  id: string;
  building_id: string;
  unit_id: string;
  person_type: DocAccessPersonType;
  /** null = applies to ALL folders (whole-unit block). Otherwise applies only to that folder. */
  folder: string | null;
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
    mutationFn: async ({
      buildingId,
      unitId,
      personType,
      folder,
      blocked,
    }: {
      buildingId: string;
      unitId: string;
      personType: DocAccessPersonType;
      /** null = whole-unit block, otherwise specific folder */
      folder?: string | null;
      blocked: boolean;
    }) => {
      const f = folder ?? null;
      if (blocked) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("unit_document_access_blocks" as any)
          .insert({
            building_id: buildingId,
            unit_id: unitId,
            person_type: personType,
            folder: f,
            blocked_by: user?.id || null,
          } as any);
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        let q = supabase
          .from("unit_document_access_blocks" as any)
          .delete()
          .eq("building_id", buildingId)
          .eq("unit_id", unitId)
          .eq("person_type", personType);
        if (f === null) {
          q = q.is("folder", null);
        } else {
          q = q.eq("folder", f);
        }
        const { error } = await q;
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unit_document_access_blocks"] });
      qc.invalidateQueries({ queryKey: ["unit_doc_access_check"] });
      qc.invalidateQueries({ queryKey: ["unit_doc_folder_blocks"] });
      toast({ title: "موفق", description: "تنظیمات دسترسی بروزرسانی شد" });
    },
    onError: (e: any) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });
}
