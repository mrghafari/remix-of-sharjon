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
import { toast } from "@/hooks/use-toast";
import type { FundType } from "@/hooks/useExpenses";

const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const isPenaltyDescription = (d?: string | null) =>
  !!d && (d.startsWith("جریمه تأخیر") || d.startsWith("جریمه "));

/**
 * Automatically applies late penalties as positive unit_charges rows, per fund.
 *
 * Per unit, per past Jalali period (year, month), per fund_type:
 *   - applyBase = latest created_at of that unit's NON-penalty unit_charges of
 *     the same fund_type for the period. If none exist, the fund is skipped
 *     (no charge = no penalty). NO end-of-month fallback.
 *   - Waits until applyBase + late_grace_days has passed.
 *   - Computes fund debt up to the period:
 *       paid (payments of this fund up to applyBase + grace)
 *       - expense shares (only "charge" fund uses expense_unit_shares)
 *       - non-penalty unit_charges of this fund up to period
 *   - If balance < 0, penalty = abs(balance) * (late_penalty_percent_per_month / 100).
 *   - Skips if a penalty row already exists for (unit, year, month, fund_type).
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

    const maxMonths = Math.max(1, policy.late_penalty_max_months || 1);
    const periods: Array<{ y: number; m: number }> = [];
    for (let i = 1; i <= maxMonths; i++) {
      let m = curM - i;
      let y = curY;
      while (m <= 0) { m += 12; y -= 1; }
      periods.push({ y, m });
    }

    const graceMs = Math.max(0, policy.late_grace_days || 0) * 86400000;
    const nowMs = now.getTime();
    const funds: FundType[] = ["charge", "extra_charge"];

    // Pre-index expense dates for "charge" fund debt
    const expDateMap = new Map<string, string>();
    for (const e of expenses as any[]) {
      if (e.expense_date) expDateMap.set(e.id, e.expense_date.split("T")[0]);
    }

    (async () => {
      for (const { y, m } of periods) {
        const periodKey = `${currentBuildingId}:${y}-${m}`;
        if (ranRef.current.has(periodKey)) continue;

        // Respect manual dismissal persisted by LatePenaltyApplier
        try {
          if (typeof window !== "undefined" &&
              window.localStorage.getItem(`penalty_dismissed:${periodKey}`) === "1") {
            continue;
          }
        } catch {}

        ranRef.current.add(periodKey);

        const records: any[] = [];

        for (const u of units as any[]) {
          if (u.late_penalty_exempt) continue;

          for (const fundType of funds) {
            // Skip if a penalty row already exists for this unit/period/fund
            const alreadyApplied = (existingCharges as any[]).some(
              (c) =>
                c.unit_id === u.id &&
                c.month === m &&
                c.year === y &&
                c.fund_type === fundType &&
                isPenaltyDescription(c.description)
            );
            if (alreadyApplied) continue;

            // applyBase: latest non-penalty same-fund unit_charge created_at
            const fundDates = (existingCharges as any[])
              .filter(
                (c) =>
                  c.unit_id === u.id &&
                  c.year === y &&
                  c.month === m &&
                  c.fund_type === fundType &&
                  !isPenaltyDescription(c.description)
              )
              .map((c) => new Date(c.created_at).getTime());
            if (fundDates.length === 0) continue; // no charge this period -> no penalty
            const applyBase = Math.max(...fundDates);
            if (nowMs < applyBase + graceMs) continue;

            const cutoffIso = new Date(applyBase + graceMs).toISOString().slice(0, 10);

            // Sum payments of this fund up to cutoff
            let paid = 0;
            for (const p of payments as any[]) {
              if (p.unit_id !== u.id) continue;
              if (p.fund_type !== fundType) continue;
              if (!p.payment_date) continue;
              if (p.payment_date <= cutoffIso) paid += Number(p.amount || 0);
            }

            // Sum charges of this fund up to (y, m), excluding penalties
            let charged = 0;
            for (const c of existingCharges as any[]) {
              if (c.unit_id !== u.id) continue;
              if (c.fund_type !== fundType) continue;
              const within = c.year < y || (c.year === y && c.month <= m);
              if (!within) continue;
              if (isPenaltyDescription(c.description)) continue;
              charged += Number(c.amount || 0);
            }

            // Sum expense shares (charge fund only) up to cutoff
            let expSum = 0;
            if (fundType === "charge") {
              for (const s of shares as any[]) {
                if (s.unit_id !== u.id) continue;
                const d = expDateMap.get(s.expense_id) || s.created_at?.split("T")[0];
                if (d && d <= cutoffIso) expSum += Number(s.allocated_amount || 0);
              }
            }

            const balance = paid - (charged + expSum);
            if (balance >= 0) continue;
            const debt = Math.abs(balance);
            const penalty = Math.round((debt * policy.late_penalty_percent_per_month) / 100);
            if (penalty <= 0) continue;

            records.push({
              building_id: currentBuildingId,
              unit_id: u.id,
              amount: penalty,
              fund_type: fundType,
              month: m,
              year: y,
              description: `جریمه ${persianMonths[m - 1]} ${y}`,
              owner_name: u.owner_name || null,
              resident_name: u.resident_name || null,
            });
          }
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
