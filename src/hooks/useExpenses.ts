import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBuilding } from "@/contexts/BuildingContext";
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
  project_id: string | null;
  building_id: string;
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
  project_id?: string;
}

export function useExpenses() {
  const { currentBuildingId } = useBuilding();
  
  return useQuery({
    queryKey: ["expenses", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("expense_date", { ascending: false });
      
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!currentBuildingId,
  });
}

// Valid expense category enum values from database
const VALID_CATEGORIES = ['charge', 'repair', 'cleaning', 'water', 'electricity', 'gas', 'elevator', 'parking', 'security', 'other'];

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();
  
  return useMutation({
    mutationFn: async (expense: CreateExpenseData) => {
      if (!currentBuildingId) {
        throw new Error("ساختمان انتخاب نشده است");
      }
      
      // Validate category - if custom category, use 'other'
      const validCategory = VALID_CATEGORIES.includes(expense.category as string) 
        ? expense.category 
        : 'other';
      
      const { data, error } = await supabase
        .from("expenses")
        .insert({ 
          ...expense, 
          category: validCategory,
          building_id: currentBuildingId 
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating expense:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "موفق", description: "هزینه با موفقیت ثبت شد" });
    },
    onError: (error: any) => {
      console.error("Expense creation failed:", error);
      const message = error?.message || "خطا در ثبت هزینه";
      toast({ title: "خطا", description: message, variant: "destructive" });
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
