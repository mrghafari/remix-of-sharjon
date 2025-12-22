import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Payment {
  id: string;
  unit_id: string;
  amount: number;
  payment_date: string;
  month: number;
  year: number;
  description: string | null;
  created_at: string;
}

export interface PaymentWithUnit extends Payment {
  units: {
    unit_number: string;
    owner_name: string;
  } | null;
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          units (
            unit_number,
            owner_name
          )
        `)
        .order("payment_date", { ascending: false });
      
      if (error) throw error;
      return data as PaymentWithUnit[];
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payment: Omit<Payment, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("payments")
        .insert(payment)
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
