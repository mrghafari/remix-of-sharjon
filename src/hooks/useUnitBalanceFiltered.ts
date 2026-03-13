import { useMemo } from "react";
import { useUnits, Unit } from "./useUnits";
import { useExpenses, Expense, AllocationType } from "./useExpenses";
import { usePayments, PaymentWithUnit } from "./usePayments";
import { useActiveManager } from "./useManagers";
import { useProjects } from "./useProjects";
import { useBuilding } from "@/contexts/BuildingContext";

export interface UnitBalance {
  unit: Unit;
  totalPayments: number;
  totalAllocatedExpenses: number;
  balance: number;
  expenseBreakdown: {
    expense: Expense;
    allocatedAmount: number;
    project?: { name: string } | null;
  }[];
  paymentBreakdown: PaymentWithUnit[];
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface ManagerDiscount {
  unitId: string;
  chargeDiscountPercent: number;
  extraChargeDiscountPercent: number;
}

export interface VacantDiscount {
  chargeDiscountPercent: number;
  extraChargeDiscountPercent: number;
}

/**
 * Calculate base allocation for a single unit (before manager/vacant discounts)
 */
function calculateBaseAmount(
  expense: Expense,
  unit: Unit,
  validUnits: Unit[]
): number {
  const { allocation_type, amount, unit_id, area_ratio } = expense;

  switch (allocation_type) {
    case "single_unit":
      return unit_id === unit.id ? amount : 0;

    case "equal":
      return validUnits.length > 0 ? amount / validUnits.length : 0;

    case "by_area": {
      const totalArea = validUnits.reduce((sum, u) => sum + (u.area || 0), 0);
      if (totalArea === 0 || unit.area === null) return 0;
      return (amount * unit.area) / totalArea;
    }

    case "by_residents": {
      const totalResidents = validUnits.reduce((sum, u) => sum + (u.resident_count || 0), 0);
      if (totalResidents === 0 || unit.resident_count === null) return 0;
      return (amount * unit.resident_count) / totalResidents;
    }

    case "by_area_residents": {
      const areaWeight = (area_ratio || 50) / 100;
      const residentWeight = 1 - areaWeight;
      const totArea = validUnits.reduce((sum, u) => sum + (u.area || 0), 0);
      const totResidents = validUnits.reduce((sum, u) => sum + (u.resident_count || 0), 0);
      if (totArea === 0 || totResidents === 0) return 0;
      if (unit.area === null || unit.resident_count === null) return 0;
      const areaShare = (unit.area / totArea) * areaWeight;
      const residentShare = (unit.resident_count / totResidents) * residentWeight;
      return amount * (areaShare + residentShare);
    }

    default:
      return 0;
  }
}

/**
 * Calculate allocated amounts for ALL units for a given expense,
 * applying vacant unit discounts and redistributing to occupied units,
 * then applying manager discounts.
 */
export function calculateAllUnitAllocations(
  expense: Expense,
  allUnits: Unit[],
  managerDiscount: ManagerDiscount | null,
  vacantDiscount: VacantDiscount | null,
  projectManagerDiscount?: { chargeDiscountPercent: number; extraChargeDiscountPercent: number } | null
): Map<string, number> {
  const result = new Map<string, number>();
  const { allocation_type, fund_type } = expense;

  // Determine effective manager discount: use project-specific if expense has project_id and override exists
  const effectiveManagerDiscount = managerDiscount
    ? {
        ...managerDiscount,
        chargeDiscountPercent: projectManagerDiscount
          ? projectManagerDiscount.chargeDiscountPercent
          : managerDiscount.chargeDiscountPercent,
        extraChargeDiscountPercent: projectManagerDiscount
          ? projectManagerDiscount.extraChargeDiscountPercent
          : managerDiscount.extraChargeDiscountPercent,
      }
    : null;

  // For single_unit allocation, no redistribution needed
  if (allocation_type === "single_unit") {
    allUnits.forEach((unit) => {
      let amount = expense.unit_id === unit.id ? expense.amount : 0;
      if (effectiveManagerDiscount && unit.id === effectiveManagerDiscount.unitId && amount > 0) {
        const dp = fund_type === "charge" ? effectiveManagerDiscount.chargeDiscountPercent : effectiveManagerDiscount.extraChargeDiscountPercent;
        amount = amount * (1 - dp / 100);
      }
      result.set(unit.id, amount);
    });
    return result;
  }

  // Filter valid units for the allocation method
  const validUnits = allUnits.filter((u) => {
    switch (allocation_type) {
      case "by_area": return u.area !== null && u.area > 0;
      case "by_residents": return u.resident_count !== null && u.resident_count > 0;
      case "by_area_residents": return u.area !== null && u.area > 0 && u.resident_count !== null && u.resident_count > 0;
      default: return true;
    }
  });

  // Step 1: Calculate base amounts for all units
  const baseAmounts = new Map<string, number>();
  validUnits.forEach((unit) => {
    baseAmounts.set(unit.id, calculateBaseAmount(expense, unit, validUnits));
  });

  // Step 2: Apply vacant discount and calculate total discount to redistribute
  const vacantDiscountPercent = vacantDiscount
    ? (fund_type === "charge" ? vacantDiscount.chargeDiscountPercent : vacantDiscount.extraChargeDiscountPercent)
    : 0;

  let totalVacantDiscount = 0;
  const vacantUnitIds = new Set<string>();
  const occupiedUnitIds = new Set<string>();

  validUnits.forEach((unit) => {
    if (unit.is_occupied === false && vacantDiscountPercent > 0) {
      vacantUnitIds.add(unit.id);
      const base = baseAmounts.get(unit.id) || 0;
      const discount = base * (vacantDiscountPercent / 100);
      totalVacantDiscount += discount;
      baseAmounts.set(unit.id, base - discount);
    } else {
      occupiedUnitIds.add(unit.id);
    }
  });

  // Step 3: Redistribute vacant discount to occupied units proportionally
  if (totalVacantDiscount > 0 && occupiedUnitIds.size > 0) {
    let totalOccupiedBase = 0;
    occupiedUnitIds.forEach((id) => {
      totalOccupiedBase += baseAmounts.get(id) || 0;
    });

    if (totalOccupiedBase > 0) {
      occupiedUnitIds.forEach((id) => {
        const base = baseAmounts.get(id) || 0;
        const share = (base / totalOccupiedBase) * totalVacantDiscount;
        baseAmounts.set(id, base + share);
      });
    }
  }

  // Step 4: Apply manager discount and redistribute
  let totalManagerDiscount = 0;
  const managerUnitId = effectiveManagerDiscount?.unitId;
  
  if (effectiveManagerDiscount && managerUnitId) {
    const managerBase = baseAmounts.get(managerUnitId) || 0;
    if (managerBase > 0) {
      const dp = fund_type === "charge" ? effectiveManagerDiscount.chargeDiscountPercent : effectiveManagerDiscount.extraChargeDiscountPercent;
      totalManagerDiscount = managerBase * (dp / 100);
      baseAmounts.set(managerUnitId, managerBase - totalManagerDiscount);
    }
  }

  // Step 5: Redistribute manager discount to other units proportionally
  if (totalManagerDiscount > 0) {
    const otherUnitIds = [...baseAmounts.keys()].filter((id) => id !== managerUnitId);
    let totalOtherBase = 0;
    otherUnitIds.forEach((id) => {
      totalOtherBase += baseAmounts.get(id) || 0;
    });

    if (totalOtherBase > 0) {
      otherUnitIds.forEach((id) => {
        const base = baseAmounts.get(id) || 0;
        const share = (base / totalOtherBase) * totalManagerDiscount;
        baseAmounts.set(id, base + share);
      });
    }
  }

  // Final: set results
  allUnits.forEach((unit) => {
    result.set(unit.id, baseAmounts.get(unit.id) || 0);
  });

  return result;
}

/** Legacy single-unit calculation wrapper */
export function calculateAllocatedAmount(
  expense: Expense,
  unit: Unit,
  allUnits: Unit[],
  managerDiscount: ManagerDiscount | null,
  vacantDiscount: VacantDiscount | null = null,
  projectManagerDiscount?: { chargeDiscountPercent: number; extraChargeDiscountPercent: number } | null
): number {
  const allocations = calculateAllUnitAllocations(expense, allUnits, managerDiscount, vacantDiscount, projectManagerDiscount);
  return allocations.get(unit.id) || 0;
}

function isInDateRange(dateStr: string, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  const date = new Date(dateStr);
  if (range.from && date < range.from) return false;
  if (range.to) {
    const endOfDay = new Date(range.to);
    endOfDay.setHours(23, 59, 59, 999);
    if (date > endOfDay) return false;
  }
  return true;
}

export function useUnitBalanceFiltered(dateRange: DateRange) {
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: activeManager, isLoading: managerLoading } = useActiveManager();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { currentBuilding } = useBuilding();

  const managerDiscount = useMemo((): ManagerDiscount | null => {
    if (!activeManager || !activeManager.unit_id) return null;
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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isInDateRange(e.expense_date, dateRange));
  }, [expenses, dateRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => isInDateRange(p.payment_date, dateRange));
  }, [payments, dateRange]);

  const unitBalances = useMemo(() => {
    // Pre-calculate all allocations per expense for efficiency
    const expenseAllocations = new Map<string, Map<string, number>>();
    filteredExpenses.forEach((expense) => {
      // For project expenses, use project-specific manager discount (default 0 = no exemption)
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
      const expenseBreakdown = filteredExpenses
        .map((expense) => ({
          expense,
          allocatedAmount: expenseAllocations.get(expense.id)?.get(unit.id) || 0,
          project: projects.find((p) => p.id === expense.project_id) || null,
        }))
        .filter((e) => e.allocatedAmount > 0);

      const totalAllocatedExpenses = expenseBreakdown.reduce(
        (sum, e) => sum + e.allocatedAmount, 0
      );

      const unitPayments = filteredPayments.filter((p) => p.unit_id === unit.id);
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
  }, [units, filteredExpenses, filteredPayments, managerDiscount, vacantDiscount, projects]);

  return {
    unitBalances,
    isLoading: unitsLoading || expensesLoading || paymentsLoading || managerLoading || projectsLoading,
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
