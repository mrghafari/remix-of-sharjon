import { useMemo } from "react";
import { useUnits, Unit } from "./useUnits";
import { useExpenses, Expense, AllocationType } from "./useExpenses";
import { usePayments, PaymentWithUnit } from "./usePayments";

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

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

function calculateAllocatedAmount(
  expense: Expense,
  unit: Unit,
  allUnits: Unit[]
): number {
  const { allocation_type, amount, unit_id, area_ratio } = expense;

  const validUnits = allUnits.filter((u) => {
    switch (allocation_type) {
      case "by_area":
        return u.area !== null && u.area > 0;
      case "by_residents":
        return u.resident_count !== null && u.resident_count > 0;
      case "by_area_residents":
        return (
          u.area !== null &&
          u.area > 0 &&
          u.resident_count !== null &&
          u.resident_count > 0
        );
      default:
        return true;
    }
  });

  switch (allocation_type) {
    case "single_unit":
      return unit_id === unit.id ? amount : 0;

    case "equal":
      return validUnits.length > 0 ? amount / validUnits.length : 0;

    case "by_area":
      const totalArea = validUnits.reduce((sum, u) => sum + (u.area || 0), 0);
      if (totalArea === 0 || unit.area === null) return 0;
      return (amount * unit.area) / totalArea;

    case "by_residents":
      const totalResidents = validUnits.reduce(
        (sum, u) => sum + (u.resident_count || 0),
        0
      );
      if (totalResidents === 0 || unit.resident_count === null) return 0;
      return (amount * unit.resident_count) / totalResidents;

    case "by_area_residents":
      const areaWeight = (area_ratio || 50) / 100;
      const residentWeight = 1 - areaWeight;

      const totArea = validUnits.reduce((sum, u) => sum + (u.area || 0), 0);
      const totResidents = validUnits.reduce(
        (sum, u) => sum + (u.resident_count || 0),
        0
      );

      if (totArea === 0 || totResidents === 0) return 0;
      if (unit.area === null || unit.resident_count === null) return 0;

      const areaShare = (unit.area / totArea) * areaWeight;
      const residentShare = (unit.resident_count / totResidents) * residentWeight;

      return amount * (areaShare + residentShare);

    default:
      return 0;
  }
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

  // Filter expenses and payments by date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isInDateRange(e.expense_date, dateRange));
  }, [expenses, dateRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => isInDateRange(p.payment_date, dateRange));
  }, [payments, dateRange]);

  const unitBalances = useMemo(() => {
    return units.map((unit): UnitBalance => {
      const expenseBreakdown = filteredExpenses.map((expense) => ({
        expense,
        allocatedAmount: calculateAllocatedAmount(expense, unit, units),
      })).filter((e) => e.allocatedAmount > 0);

      const totalAllocatedExpenses = expenseBreakdown.reduce(
        (sum, e) => sum + e.allocatedAmount,
        0
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
  }, [units, filteredExpenses, filteredPayments]);

  return {
    unitBalances,
    isLoading: unitsLoading || expensesLoading || paymentsLoading,
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
