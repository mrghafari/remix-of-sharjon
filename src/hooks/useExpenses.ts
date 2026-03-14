import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBuilding } from "@/contexts/BuildingContext";
import { useUnits } from "./useUnits";
import { useActiveManager } from "./useManagers";
import { useProjects } from "./useProjects";
import { calculateAllUnitAllocations, ManagerDiscount, VacantDiscount } from "./useUnitBalanceFiltered";
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
  const { currentBuildingId, currentBuilding } = useBuilding();
  const { data: units = [] } = useUnits();
  const { data: activeManager } = useActiveManager();
  const { data: projects = [] } = useProjects();
  
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

      // Calculate and store unit shares snapshot
      await storeExpenseShares(data as Expense, units, activeManager, currentBuilding, projects, currentBuildingId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-unit-shares"] });
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
  const { currentBuildingId, currentBuilding } = useBuilding();
  const { data: units = [] } = useUnits();
  const { data: activeManager } = useActiveManager();
  const { data: projects = [] } = useProjects();
  
  return useMutation({
    mutationFn: async ({ id, ...expense }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(expense)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Delete old shares and recalculate
      await supabase
        .from("expense_unit_shares")
        .delete()
        .eq("expense_id", id);

      await storeExpenseShares(data as Expense, units, activeManager, currentBuilding, projects, currentBuildingId!);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-unit-shares"] });
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
      // Shares will be cascade-deleted
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-unit-shares"] });
      toast({ title: "حذف شد", description: "هزینه با موفقیت حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف هزینه", variant: "destructive" });
    },
  });
}

/** Helper to calculate and store expense shares snapshot */
async function storeExpenseShares(
  expense: Expense,
  units: any[],
  activeManager: any,
  currentBuilding: any,
  projects: any[],
  buildingId: string
) {
  if (units.length === 0) return;

  const managerDiscount: ManagerDiscount | null = activeManager?.unit_id
    ? {
        unitId: activeManager.unit_id,
        chargeDiscountPercent: activeManager.charge_discount_percent,
        extraChargeDiscountPercent: activeManager.extra_charge_discount_percent,
      }
    : null;

  const vacantDiscount: VacantDiscount | null = currentBuilding
    ? (() => {
        const c = currentBuilding.vacant_charge_discount_percent || 0;
        const e = currentBuilding.vacant_extra_charge_discount_percent || 0;
        return c === 0 && e === 0 ? null : { chargeDiscountPercent: c, extraChargeDiscountPercent: e };
      })()
    : null;

  const project = expense.project_id ? projects.find((p: any) => p.id === expense.project_id) : null;
  const projectMgrDiscount = project
    ? project.apply_manager_discount
      ? undefined
      : { chargeDiscountPercent: 0, extraChargeDiscountPercent: 0 }
    : undefined;

  const allocations = calculateAllUnitAllocations(expense, units, managerDiscount, vacantDiscount, projectMgrDiscount);

  const shares = Array.from(allocations.entries())
    .filter(([, amount]) => amount > 0)
    .map(([unitId, amount]) => ({
      expense_id: expense.id,
      unit_id: unitId,
      building_id: buildingId,
      allocated_amount: amount,
    }));

  if (shares.length > 0) {
    const { error } = await supabase
      .from("expense_unit_shares")
      .insert(shares);

    if (error) {
      console.error("Error storing expense shares:", error);
    }
  }
}
