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

function calculateAllocatedAmount(
  expense: Expense,
  unit: Unit,
  allUnits: Unit[]
): number {
  const { allocation_type, amount, unit_id, area_ratio } = expense;

  // Filter units that have required data for allocation
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
      // Only the specific unit gets the expense
      return unit_id === unit.id ? amount : 0;

    case "equal":
      // Split equally among all units
      return validUnits.length > 0 ? amount / validUnits.length : 0;

    case "by_area":
      // Split by area ratio
      const totalArea = validUnits.reduce((sum, u) => sum + (u.area || 0), 0);
      if (totalArea === 0 || unit.area === null) return 0;
      return (amount * unit.area) / totalArea;

    case "by_residents":
      // Split by resident count
      const totalResidents = validUnits.reduce(
        (sum, u) => sum + (u.resident_count || 0),
        0
      );
      if (totalResidents === 0 || unit.resident_count === null) return 0;
      return (amount * unit.resident_count) / totalResidents;

    case "by_area_residents":
      // Split by combination of area and residents with configurable ratio
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

export function useUnitBalance() {
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();

  const unitBalances = useMemo(() => {
    return units.map((unit): UnitBalance => {
      // Calculate allocated expenses for this unit
      const expenseBreakdown = expenses.map((expense) => ({
        expense,
        allocatedAmount: calculateAllocatedAmount(expense, unit, units),
      })).filter((e) => e.allocatedAmount > 0);

      const totalAllocatedExpenses = expenseBreakdown.reduce(
        (sum, e) => sum + e.allocatedAmount,
        0
      );

      // Calculate total payments for this unit
      const unitPayments = payments.filter((p) => p.unit_id === unit.id);
      const totalPayments = unitPayments.reduce((sum, p) => sum + p.amount, 0);

      // Balance = Payments - Expenses
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
  }, [units, expenses, payments]);

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
