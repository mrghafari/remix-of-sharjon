import { useMemo } from "react";
import { useUnits, Unit } from "./useUnits";
import { useExpenses, Expense } from "./useExpenses";
import { usePayments, PaymentWithUnit } from "./usePayments";
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
  }[];
  paymentBreakdown: PaymentWithUnit[];
  chargeBreakdown: UnitCharge[];
}

export function useUnitBalance() {
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: shares = [], isLoading: sharesLoading } = useExpenseShares();
  const { data: unitCharges = [], isLoading: chargesLoading } = useUnitCharges();

  const unitBalances = useMemo(() => {
    const shareMap = new Map<string, Map<string, number>>();
    shares.forEach((s) => {
      if (!shareMap.has(s.expense_id)) {
        shareMap.set(s.expense_id, new Map());
      }
      shareMap.get(s.expense_id)!.set(s.unit_id, s.allocated_amount);
    });

    return units.map((unit): UnitBalance => {
      const expenseBreakdown = expenses
        .map((expense) => ({
          expense,
          allocatedAmount: shareMap.get(expense.id)?.get(unit.id) || 0,
        }))
        .filter((e) => e.allocatedAmount > 0);

      const totalAllocatedExpenses = expenseBreakdown.reduce(
        (sum, e) => sum + e.allocatedAmount, 0
      );

      const chargeBreakdown = unitCharges.filter((c) => c.unit_id === unit.id);
      const totalCharges = chargeBreakdown.reduce((sum, c) => sum + c.amount, 0);

      const unitPayments = payments.filter((p) => p.unit_id === unit.id);
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
  }, [units, expenses, payments, shares, unitCharges]);

  return {
    unitBalances,
    isLoading: unitsLoading || expensesLoading || paymentsLoading || sharesLoading || chargesLoading,
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
