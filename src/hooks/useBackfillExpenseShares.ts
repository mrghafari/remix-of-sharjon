import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExpenses } from "./useExpenses";
import { useUnits } from "./useUnits";
import { useActiveManager } from "./useManagers";
import { useProjects } from "./useProjects";
import { useBuilding } from "@/contexts/BuildingContext";
import { useExpenseShares } from "./useExpenseShares";
import { calculateAllUnitAllocations, ManagerDiscount, VacantDiscount } from "./useUnitBalanceFiltered";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Auto-backfills expense_unit_shares for any expenses that don't have stored shares yet.
 * This runs once when the data is loaded.
 */
export function useBackfillExpenseShares() {
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: activeManager, isLoading: managerLoading } = useActiveManager();
  const { data: projects = [] } = useProjects();
  const { currentBuildingId, currentBuilding } = useBuilding();
  const { data: shares = [], isLoading: sharesLoading } = useExpenseShares();
  const queryClient = useQueryClient();
  const hasRun = useRef<string | null>(null);

  useEffect(() => {
    if (expensesLoading || unitsLoading || managerLoading || sharesLoading) return;
    if (!currentBuildingId || units.length === 0 || expenses.length === 0) return;
    // Only run once per building
    if (hasRun.current === currentBuildingId) return;

    // Find expenses that don't have any shares stored
    const expenseIdsWithShares = new Set(shares.map((s) => s.expense_id));
    const expensesNeedingBackfill = expenses.filter((e) => !expenseIdsWithShares.has(e.id));

    if (expensesNeedingBackfill.length === 0) {
      hasRun.current = currentBuildingId;
      return;
    }

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

    const backfill = async () => {
      const allShares: Array<{
        expense_id: string;
        unit_id: string;
        building_id: string;
        allocated_amount: number;
      }> = [];

      for (const expense of expensesNeedingBackfill) {
        const project = expense.project_id ? projects.find((p) => p.id === expense.project_id) : null;
        const projectMgrDiscount = project
          ? project.apply_manager_discount
            ? undefined
            : { chargeDiscountPercent: 0, extraChargeDiscountPercent: 0 }
          : undefined;

        const allocations = calculateAllUnitAllocations(expense, units, managerDiscount, vacantDiscount, projectMgrDiscount);

        allocations.forEach((amount, unitId) => {
          if (amount > 0) {
            allShares.push({
              expense_id: expense.id,
              unit_id: unitId,
              building_id: currentBuildingId!,
              allocated_amount: amount,
            });
          }
        });
      }

      if (allShares.length > 0) {
        // Insert in batches of 500
        for (let i = 0; i < allShares.length; i += 500) {
          const batch = allShares.slice(i, i + 500);
          const { error } = await supabase
            .from("expense_unit_shares")
            .insert(batch);

          if (error) {
            console.error("Backfill error:", error);
            return; // Don't mark as run if there was an error
          }
        }

        queryClient.invalidateQueries({ queryKey: ["expense-unit-shares"] });
        console.log(`Backfilled ${allShares.length} expense shares for ${expensesNeedingBackfill.length} expenses`);
      }

      hasRun.current = currentBuildingId;
    };

    backfill();
  }, [expenses, units, activeManager, projects, currentBuildingId, currentBuilding, shares, expensesLoading, unitsLoading, managerLoading, sharesLoading, queryClient]);
}
