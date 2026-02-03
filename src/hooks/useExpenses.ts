import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];
export type FundType = "charge" | "extra_charge";
export type AllocationType = "single_unit" | "by_area" | "by_residents" | "by_area_residents" | "equal";

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  expense_date: string;
  is_paid: boolean;
  unit_id: string | null;
  fund_type: FundType;
  allocation_type: AllocationType;
  area_ratio: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  title: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  expense_date?: string;
  is_paid?: boolean;
  unit_id?: string;
  fund_type?: FundType;
  allocation_type?: AllocationType;
  area_ratio?: number;
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      
      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: CreateExpenseData) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert(expense)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "موفق", description: "هزینه با موفقیت ثبت شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ثبت هزینه", variant: "destructive" });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...expense }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(expense)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "موفق", description: "هزینه با موفقیت بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی هزینه", variant: "destructive" });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "حذف شد", description: "هزینه با موفقیت حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف هزینه", variant: "destructive" });
    },
  });
}
