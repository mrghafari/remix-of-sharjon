import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBuilding } from "@/contexts/BuildingContext";

export interface BankAccount {
  id: string;
  building_id: string;
  iban: string;
  account_holder: string;
  bank_name: string | null;
  is_approved: boolean;
  is_rejected: boolean;
  is_active: boolean;
  approved_at: string | null;
  approved_by: string | null;
  admin_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts(buildingIdOverride?: string) {
  const { currentBuildingId } = useBuilding();
  const buildingId = buildingIdOverride ?? currentBuildingId;

  return useQuery({
    queryKey: ["bank-accounts", buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const { data, error } = await supabase
        .from("building_bank_accounts")
        .select("*")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!buildingId,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();

  return useMutation({
    mutationFn: async (input: { iban: string; account_holder: string; bank_name?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId || !currentBuildingId) throw new Error("Auth required");

      const { data, error } = await supabase
        .from("building_bank_accounts")
        .insert({
          building_id: currentBuildingId,
          iban: input.iban,
          account_holder: input.account_holder,
          bank_name: input.bank_name || null,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "ثبت شد", description: "حساب بانکی ثبت شد و در انتظار تایید ادمین است" });
    },
    onError: (e: any) => {
      toast({ title: "خطا", description: e?.message || "خطا در ثبت حساب بانکی", variant: "destructive" });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      const { error } = await supabase.from("building_bank_accounts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "موفق", description: "حساب بانکی به‌روزرسانی شد" });
    },
    onError: (e: any) => {
      toast({ title: "خطا", description: e?.message || "خطا", variant: "destructive" });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("building_bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "حذف شد", description: "حساب بانکی حذف شد" });
    },
    onError: (e: any) => {
      toast({ title: "خطا", description: e?.message || "خطا", variant: "destructive" });
    },
  });
}
