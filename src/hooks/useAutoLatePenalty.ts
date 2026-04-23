import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { usePaymentPolicy } from "@/hooks/usePaymentPolicy";
import { useUnits } from "@/hooks/useUnits";
import { usePayments } from "@/hooks/usePayments";
import { useExpenseShares } from "@/hooks/useExpenseShares";
import { useExpenses } from "@/hooks/useExpenses";
import { useUnitCharges } from "@/hooks/useUnitCharges";
import { endOfJalaliMonthIso } from "@/lib/jalaliMonthRange";
import { toast } from "@/hooks/use-toast";

const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const isPenaltyDescription = (d?: string | null) =>
  !!d && (d.startsWith("جریمه تأخیر") || d.startsWith("جریمه "));

/**
 * Automatically applies late penalties for past Jalali months when:
 *  - policy.late_penalty_enabled === true
 *  - policy.late_penalty_auto_apply === true
 *  - the (year, month) period is in the past (before current jalali month)
 *  - no penalty record yet exists for that unit & period
 *
 * Computes per unit: end-of-month balance EXCLUDING penalty rows.
 * Runs once per (building, period) per session.
 */
export function useAutoLatePenalty() {
  const { currentBuildingId } = useBuilding();
  const { data: policy } = usePaymentPolicy();
  const { data: units = [] } = useUnits();
  const { data: payments = [] } = usePayments();
  const { data: shares = [] } = useExpenseShares();
  const { data: expenses = [] } = useExpenses();
  const { data: existingCharges = [] } = useUnitCharges();
  const qc = useQueryClient();
  const ranRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentBuildingId) return;
    if (!policy?.late_penalty_enabled || !policy?.late_penalty_auto_apply) return;
    if (policy.late_penalty_percent_per_month <= 0) return;
    if (!units.length) return;

    const now = new Date();
    const curM = Number(format(now, "M", { locale: faIR }));
    const curY = Number(format(now, "yyyy", { locale: faIR }));

    // Determine target periods: any past jalali month back to (curY, curM-1) and a few before,
    // up to late_penalty_max_months back, that has any data.
    const maxMonths = Math.max(1, policy.late_penalty_max_months || 1);
    const periods: Array<{ y: number; m: number }> = [];
    for (let i = 1; i <= maxMonths; i++) {
      let m = curM - i;
      let y = curY;
      while (m <= 0) { m += 12; y -= 1; }
      periods.push({ y, m });
    }

    (async () => {
      for (const { y, m } of periods) {
        const key = `${currentBuildingId}:${y}-${m}`;
        if (ranRef.current.has(key)) continue;
        ranRef.current.add(key);

        const cutoffIso = endOfJalaliMonthIso(y, m);

        // payments
        const paySum = new Map<string, number>();
        for (const p of payments as any[]) {
          if (p.payment_date && p.payment_date <= cutoffIso) {
            paySum.set(p.unit_id, (paySum.get(p.unit_id) || 0) + Number(p.amount || 0));
          }
        }
        // expense shares (date from parent expense)
        const expDateMap = new Map<string, string>();
        for (const e of expenses as any[]) {
          if (e.expense_date) expDateMap.set(e.id, e.expense_date.split("T")[0]);
        }
        const expSum = new Map<string, number>();
        for (const s of shares as any[]) {
          const d = expDateMap.get(s.expense_id) || s.created_at?.split("T")[0];
          if (d && d <= cutoffIso) {
            expSum.set(s.unit_id, (expSum.get(s.unit_id) || 0) + Number(s.allocated_amount || 0));
          }
        }
        // unit_charges up to (y, m), excluding penalties
        const chargeSum = new Map<string, number>();
        for (const c of existingCharges as any[]) {
          const within = c.year < y || (c.year === y && c.month <= m);
          if (!within) continue;
          if (isPenaltyDescription(c.description)) continue;
          chargeSum.set(c.unit_id, (chargeSum.get(c.unit_id) || 0) + Number(c.amount || 0));
        }

        const records: any[] = [];
        for (const u of units as any[]) {
          if (u.late_penalty_exempt) continue;
          const alreadyApplied = (existingCharges as any[]).some(
            (c) =>
              c.unit_id === u.id &&
              c.month === m &&
              c.year === y &&
              isPenaltyDescription(c.description)
          );
          if (alreadyApplied) continue;
          const paid = paySum.get(u.id) || 0;
          const exp = expSum.get(u.id) || 0;
          const ch = chargeSum.get(u.id) || 0;
          const balance = paid - (exp + ch);
          if (balance >= 0) continue;
          const debt = Math.abs(balance);
          const penalty = Math.round((debt * policy.late_penalty_percent_per_month) / 100);
          if (penalty <= 0) continue;
          records.push({
            building_id: currentBuildingId,
            unit_id: u.id,
            amount: penalty,
            fund_type: "charge",
            month: m,
            year: y,
            description: `جریمه ${persianMonths[m - 1]} ${y}`,
            owner_name: u.owner_name || null,
            resident_name: u.resident_name || null,
          });
        }

        if (records.length > 0) {
          const { error } = await supabase.from("unit_charges").insert(records);
          if (!error) {
            qc.invalidateQueries({ queryKey: ["unit-charges"] });
            toast({
              title: "جریمه خودکار اعمال شد",
              description: `${records.length} رکورد جریمه برای ${persianMonths[m - 1]} ${y} ثبت شد.`,
            });
          }
        }
      }
    })();
  }, [currentBuildingId, policy, units, payments, shares, expenses, existingCharges, qc]);
}
