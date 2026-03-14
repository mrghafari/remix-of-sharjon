import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBuilding } from "@/contexts/BuildingContext";

export type FundType = "charge" | "extra_charge";

export interface Payment {
  id: string;
  unit_id: string;
  amount: number;
  payment_date: string;
  month: number;
  year: number;
  description: string | null;
  fund_type: FundType;
  building_id: string;
  created_at: string;
}

export interface PaymentWithUnit extends Payment {
  units: {
    unit_number: string;
    owner_name: string;
  } | null;
}

export function usePayments() {
  const { currentBuildingId } = useBuilding();
  
  return useQuery({
    queryKey: ["payments", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          units (
            unit_number,
            owner_name
          )
        `)
        .eq("building_id", currentBuildingId)
        .order("payment_date", { ascending: false });
      
      if (error) throw error;
      return data as PaymentWithUnit[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();
  
  return useMutation({
    mutationFn: async (payment: Omit<Payment, "id" | "created_at" | "building_id">) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({ ...payment, building_id: currentBuildingId! })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "موفق", description: "پرداخت با موفقیت ثبت شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ثبت پرداخت", variant: "destructive" });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; unit_id?: string; amount?: number; month?: number; year?: number; fund_type?: FundType; description?: string | null; payment_date?: string }) => {
      const { error } = await supabase.from("payments").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "موفق", description: "پرداخت ویرایش شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ویرایش پرداخت", variant: "destructive" });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "حذف شد", description: "پرداخت با موفقیت حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف پرداخت", variant: "destructive" });
    },
  });
}
