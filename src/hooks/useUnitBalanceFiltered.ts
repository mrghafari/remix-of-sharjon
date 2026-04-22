import { useMemo } from "react";
import { useUnits, Unit } from "./useUnits";
import { useExpenses, Expense, AllocationType } from "./useExpenses";
import { usePayments, PaymentWithUnit } from "./usePayments";
import { useProjects } from "./useProjects";
import { useExpenseShares } from "./useExpenseShares";
import { useUnitCharges, UnitCharge } from "./useUnitCharges";

export interface UnitBalance {
  unit: Unit;
  totalPayments: number;
  totalAllocatedExpenses: number;
  totalCharges: number;
  balance: number;
  expenseBreakdown: {
    expense: Expense;
    allocatedAmount: number;
    project?: { name: string } | null;
    ownerName?: string | null;
    residentName?: string | null;
  }[];
  paymentBreakdown: PaymentWithUnit[];
  chargeBreakdown: UnitCharge[];
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
 * Calculate base allocation for a single unit (before manager/vacant discounts).
 * Still exported for use at expense creation time (snapshotting).
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
 * 
 * This is used at EXPENSE CREATION TIME to snapshot allocations.
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

  if (allocation_type === "single_unit") {
    allUnits.forEach((unit) => {
      let amount = expense.unit_id === unit.id ? Math.round(expense.amount) : 0;
      if (effectiveManagerDiscount && unit.id === effectiveManagerDiscount.unitId && amount > 0) {
        const dp = fund_type === "charge" ? effectiveManagerDiscount.chargeDiscountPercent : effectiveManagerDiscount.extraChargeDiscountPercent;
        amount = amount * (1 - dp / 100);
      }
      result.set(unit.id, amount);
    });
    return result;
  }

  const validUnits = allUnits.filter((u) => {
    switch (allocation_type) {
      case "by_area": return u.area !== null && u.area > 0;
      case "by_residents": return u.resident_count !== null && u.resident_count > 0;
      case "by_area_residents": return u.area !== null && u.area > 0 && u.resident_count !== null && u.resident_count > 0;
      default: return true;
    }
  });

  const baseAmounts = new Map<string, number>();
  validUnits.forEach((unit) => {
    baseAmounts.set(unit.id, calculateBaseAmount(expense, unit, validUnits));
  });

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

  allUnits.forEach((unit) => {
    result.set(unit.id, Math.round(baseAmounts.get(unit.id) || 0));
  });

  return result;
}

/** Legacy single-unit calculation wrapper - used only for snapshotting */
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

/**
 * Unit balance hook using STORED shares (snapshot at creation time).
 * Changes to unit area, residents, or discounts will NOT affect past expenses.
 */
export function useUnitBalanceFiltered(dateRange: DateRange) {
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: shares = [], isLoading: sharesLoading } = useExpenseShares();
  const { data: unitCharges = [], isLoading: chargesLoading } = useUnitCharges();

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isInDateRange(e.expense_date, dateRange));
  }, [expenses, dateRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => isInDateRange(p.payment_date, dateRange));
  }, [payments, dateRange]);

  const filteredCharges = useMemo(() => {
    return unitCharges.filter((c) => isInDateRange(c.created_at, dateRange));
  }, [unitCharges, dateRange]);

  // Build share map from stored snapshots
  const shareMap = useMemo(() => {
    const map = new Map<string, Map<string, { amount: number; ownerName: string | null; residentName: string | null }>>();
    shares.forEach((s) => {
      if (!map.has(s.expense_id)) {
        map.set(s.expense_id, new Map());
      }
      map.get(s.expense_id)!.set(s.unit_id, {
        amount: s.allocated_amount,
        ownerName: s.owner_name,
        residentName: s.resident_name,
      });
    });
    return map;
  }, [shares]);

  const unitBalances = useMemo(() => {
    return units.map((unit): UnitBalance => {
      const expenseBreakdown = filteredExpenses
        .map((expense) => {
          const share = shareMap.get(expense.id)?.get(unit.id);
          return {
            expense,
            allocatedAmount: share?.amount || 0,
            project: projects.find((p) => p.id === expense.project_id) || null,
            ownerName: share ? share.ownerName : unit.owner_name,
            residentName: share ? share.residentName : unit.resident_name,
          };
        })
        .filter((e) => e.allocatedAmount > 0);

      const totalAllocatedExpenses = expenseBreakdown.reduce(
        (sum, e) => sum + e.allocatedAmount, 0
      );

      const chargeBreakdown = filteredCharges.filter((c) => c.unit_id === unit.id);
      const totalCharges = chargeBreakdown.reduce((sum, c) => sum + c.amount, 0);

      const unitPayments = filteredPayments.filter((p) => p.unit_id === unit.id);
      const totalPayments = unitPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalPayments - totalAllocatedExpenses - totalCharges;

      return {
        unit,
        totalPayments,
        totalAllocatedExpenses,
        totalCharges,
        balance,
        expenseBreakdown,
        paymentBreakdown: unitPayments,
        chargeBreakdown,
      };
    });
  }, [units, filteredExpenses, filteredPayments, filteredCharges, shareMap, projects]);

  return {
    unitBalances,
    isLoading: unitsLoading || expensesLoading || paymentsLoading || projectsLoading || sharesLoading || chargesLoading,
    totals: useMemo(() => {
      const totalPayments = unitBalances.reduce((sum, ub) => sum + ub.totalPayments, 0);
      const totalExpenses = unitBalances.reduce((sum, ub) => sum + ub.totalAllocatedExpenses, 0);
      const totalCharges = unitBalances.reduce((sum, ub) => sum + ub.totalCharges, 0);
      return {
        totalPayments,
        totalExpenses,
        totalCharges,
        totalBalance: totalPayments - totalExpenses - totalCharges,
      };
    }, [unitBalances]),
  };
}
