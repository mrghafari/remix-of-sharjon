import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { usePaymentPolicy } from "@/hooks/usePaymentPolicy";
import { useUnits } from "@/hooks/useUnits";
import { usePayments } from "@/hooks/usePayments";
import { useUnitCharges } from "@/hooks/useUnitCharges";
import { toast } from "@/hooks/use-toast";
import type { FundType } from "@/hooks/useExpenses";

const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const isDiscountDescription = (d?: string | null) =>
  !!d && d.startsWith("تخفیف خوش‌حسابی");

const isMetaDescription = (d?: string | null) =>
  !!d && (d.startsWith("جریمه") || d.startsWith("تخفیف خوش‌حسابی"));

const startOfLocalDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Automatically applies early-pay (خوش‌حسابی) discounts as NEGATIVE unit_charges
 * (one row per fund: charge / extra_charge). The discount reduces the unit's
 * charge/extra-charge debt and does NOT touch the fund balance.
 *
 * Per unit, per period (year, month), per fund_type:
 *   - applyBase = latest created_at of that unit's NON-meta unit_charges of the
 *     SAME fund_type for the period. If none exist, the fund is skipped.
 *   - For each payment of that fund_type for the period made on/after applyBase
 *     and within [applyBase, applyBase + early_pay_days]:
 *       factor   = max(0, (early_pay_days - daysElapsed)) / early_pay_days
 *       discount = paid * (early_pay_discount_percent / 100) * factor
 *   - Skips if a negative discount row already exists for the same
 *     (unit, year, month, fund_type).
 *   - Waits until applyBase + early_pay_days has passed so we never
 *     under-credit a unit that pays later in the window.
 */
export function useAutoEarlyPay() {
  const { currentBuildingId } = useBuilding();
  const { data: policy } = usePaymentPolicy();
  const { data: units = [] } = useUnits();
  const { data: payments = [] } = usePayments();
  const { data: existingCharges = [] } = useUnitCharges();
  const qc = useQueryClient();
  const ranRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentBuildingId) return;
    if (!policy?.early_pay_enabled || !policy?.early_pay_auto_apply) return;
    if (policy.early_pay_discount_percent <= 0) return;
    if ((policy.early_pay_days || 0) <= 0) return;
    if (!units.length) return;

    const now = new Date();
    const curM = Number(format(now, "M", { locale: faIR }));
    const curY = Number(format(now, "yyyy", { locale: faIR }));
    const pct = policy.early_pay_discount_percent / 100;
    const funds: FundType[] = ["charge", "extra_charge"];

    const periods: Array<{ y: number; m: number }> = [];
    for (let i = 0; i < 12; i++) {
      let m = curM - i;
      let y = curY;
      while (m <= 0) { m += 12; y -= 1; }
      periods.push({ y, m });
    }

    (async () => {
      for (const { y, m } of periods) {
        // Signature key: re-run when payments/charges for this period change
        const sig = `${currentBuildingId}:earlypay:${y}-${m}:` +
          (payments as any[]).filter((p: any) => p.year === y && p.month === m).length + ":" +
          (existingCharges as any[]).filter((c: any) => c.year === y && c.month === m).length;
        if (ranRef.current.has(sig)) continue;
        ranRef.current.add(sig);


        const records: any[] = [];

        const idsToDelete: string[] = [];

        for (const u of units as any[]) {
          for (const fundType of funds) {
            // Non-meta charges for this unit/period/fund (روزِ اعمال هر ردیف = created_at آن)
            const unitCharges = (existingCharges as any[]).filter(
              (c) =>
                c.unit_id === u.id &&
                c.year === y &&
                c.month === m &&
                c.fund_type === fundType &&
                !isMetaDescription(c.description)
            );
            if (unitCharges.length === 0) continue;

            // Calculate discount per-charge based on its own created_at و paid_at
            let discount = 0;
            for (const c of unitCharges) {
              const amt = Number(c.amount || 0);
              const paid = Number(c.paid_amount || 0);
              if (paid <= 0) continue;
              if (!c.paid_at) continue;
              const baseMs = new Date(c.created_at).getTime();
              const paidMs = new Date(c.paid_at).getTime();
              if (paidMs < baseMs) continue;
              const daysElapsed = Math.floor((startOfLocalDay(paidMs) - startOfLocalDay(baseMs)) / 86400000);
              if (daysElapsed > policy.early_pay_days) continue;
              const factor =
                Math.max(0, policy.early_pay_days - daysElapsed) /
                policy.early_pay_days;
              // Discount applies to amount actually paid (capped at charge amount)
              const eligible = Math.min(paid, Math.max(amt, 0));
              discount += eligible * pct * factor;
            }


            discount = Math.round(discount);

            // Existing discount row for this (unit, period, fund)
            const existingDiscount = (existingCharges as any[]).find(
              (c) =>
                c.unit_id === u.id &&
                c.month === m &&
                c.year === y &&
                c.fund_type === fundType &&
                isDiscountDescription(c.description)
            );
            const existingAmt = existingDiscount
              ? Math.abs(Number(existingDiscount.amount || 0))
              : 0;

            // If unchanged, skip
            if (discount === existingAmt) continue;

            // Replace: delete old then insert new (only if discount > 0)
            if (existingDiscount) {
              // Only replace if not yet consumed by a payment
              if (Number(existingDiscount.paid_amount || 0) === 0) {
                idsToDelete.push(existingDiscount.id);
              } else {
                continue; // already paid, do not touch
              }
            }

            if (discount <= 0) continue;

            records.push({
              building_id: currentBuildingId,
              unit_id: u.id,
              amount: -discount,
              fund_type: fundType,
              month: m,
              year: y,
              description: `تخفیف خوش‌حسابی ${persianMonths[m - 1]} ${y}`,
              owner_name: u.owner_name || null,
              resident_name: u.resident_name || null,
            });
          }
        }

        if (idsToDelete.length > 0) {
          await supabase.from("unit_charges").delete().in("id", idsToDelete);
        }

        if (records.length > 0) {
          const { error } = await supabase.from("unit_charges").insert(records);
          if (!error) {
            qc.invalidateQueries({ queryKey: ["unit-charges"] });
            toast({
              title: "تخفیف خوش‌حسابی خودکار اعمال شد",
              description: `${records.length} رکورد تخفیف برای ${persianMonths[m - 1]} ${y} ثبت/به‌روز شد.`,
            });
          }
        } else if (idsToDelete.length > 0) {
          qc.invalidateQueries({ queryKey: ["unit-charges"] });
        }
      }
    })();
  }, [currentBuildingId, policy, units, payments, existingCharges, qc]);
}
