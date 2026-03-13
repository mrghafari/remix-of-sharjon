import { useMemo } from "react";
import { useUnits, Unit } from "./useUnits";
import { useExpenses, Expense } from "./useExpenses";
import { usePayments, PaymentWithUnit } from "./usePayments";
import { useActiveManager } from "./useManagers";
import { useProjects } from "./useProjects";
import { useBuilding } from "@/contexts/BuildingContext";
import { calculateAllUnitAllocations, ManagerDiscount, VacantDiscount } from "./useUnitBalanceFiltered";

export interface UnitBalance {
  unit: Unit;
  totalPayments: number;
  totalAllocatedExpenses: number;
  balance: number;
  expenseBreakdown: {
    expense: Expense;
    allocatedAmount: number;
  }[];
  paymentBreakdown: PaymentWithUnit[];
}

export function useUnitBalance() {
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: activeManager, isLoading: managerLoading } = useActiveManager();
  const { data: projects = [] } = useProjects();
  const { currentBuilding } = useBuilding();

  const managerDiscount = useMemo((): ManagerDiscount | null => {
    if (!activeManager) return null;
    return {
      unitId: activeManager.unit_id,
      chargeDiscountPercent: activeManager.charge_discount_percent,
      extraChargeDiscountPercent: activeManager.extra_charge_discount_percent,
    };
  }, [activeManager]);

  const vacantDiscount = useMemo((): VacantDiscount | null => {
    if (!currentBuilding) return null;
    const c = currentBuilding.vacant_charge_discount_percent || 0;
    const e = currentBuilding.vacant_extra_charge_discount_percent || 0;
    if (c === 0 && e === 0) return null;
    return { chargeDiscountPercent: c, extraChargeDiscountPercent: e };
  }, [currentBuilding]);

  const unitBalances = useMemo(() => {
    const expenseAllocations = new Map<string, Map<string, number>>();
    expenses.forEach((expense) => {
      const project = expense.project_id ? projects.find((p) => p.id === expense.project_id) : null;
      const projectMgrDiscount = project
        ? { chargeDiscountPercent: project.manager_charge_discount_percent ?? 0, extraChargeDiscountPercent: project.manager_extra_charge_discount_percent ?? 0 }
        : undefined;
      expenseAllocations.set(
        expense.id,
        calculateAllUnitAllocations(expense, units, managerDiscount, vacantDiscount, projectMgrDiscount)
      );
    });

    return units.map((unit): UnitBalance => {
      const expenseBreakdown = expenses
        .map((expense) => ({
          expense,
          allocatedAmount: expenseAllocations.get(expense.id)?.get(unit.id) || 0,
        }))
        .filter((e) => e.allocatedAmount > 0);

      const totalAllocatedExpenses = expenseBreakdown.reduce(
        (sum, e) => sum + e.allocatedAmount, 0
      );

      const unitPayments = payments.filter((p) => p.unit_id === unit.id);
      const totalPayments = unitPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalPayments - totalAllocatedExpenses;

      return {
        unit,
        totalPayments,
        totalAllocatedExpenses,
        balance,
        expenseBreakdown,
        paymentBreakdown: unitPayments,
      };
    });
  }, [units, expenses, payments, managerDiscount, vacantDiscount, projects]);

  return {
    unitBalances,
    isLoading: unitsLoading || expensesLoading || paymentsLoading || managerLoading,
    totals: useMemo(() => {
      const totalPayments = unitBalances.reduce((sum, ub) => sum + ub.totalPayments, 0);
      const totalExpenses = unitBalances.reduce((sum, ub) => sum + ub.totalAllocatedExpenses, 0);
      return {
        totalPayments,
        totalExpenses,
        totalBalance: totalPayments - totalExpenses,
      };
    }, [unitBalances]),
  };
}
