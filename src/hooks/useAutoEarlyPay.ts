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
    const nowMs = now.getTime();
    const windowMs = policy.early_pay_days * 86400000;
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
        const key = `${currentBuildingId}:earlypay:${y}-${m}`;
        if (ranRef.current.has(key)) continue;
        ranRef.current.add(key);

        const records: any[] = [];

        for (const u of units as any[]) {
          for (const fundType of funds) {
            // Already a discount row for this unit/period/fund?
            const alreadyApplied = (existingCharges as any[]).some(
              (c) =>
                c.unit_id === u.id &&
                c.month === m &&
                c.year === y &&
                c.fund_type === fundType &&
                isDiscountDescription(c.description)
            );
            if (alreadyApplied) continue;

            // applyBase: latest non-meta same-fund charge created_at
            const unitCharges = (existingCharges as any[]).filter(
              (c) =>
                c.unit_id === u.id &&
                c.year === y &&
                c.month === m &&
                c.fund_type === fundType &&
                !isMetaDescription(c.description)
            );
            if (unitCharges.length === 0) continue;
            const applyBase = Math.max(
              ...unitCharges.map((c) => new Date(c.created_at).getTime())
            );

            // Wait until window has fully closed
            if (nowMs < applyBase + windowMs) continue;

            let discount = 0;
            for (const p of payments as any[]) {
              if (p.unit_id !== u.id) continue;
              if (p.fund_type !== fundType) continue;
              if (p.month !== m || p.year !== y) continue;
              if (!p.payment_date) continue;
              const pMs = new Date(p.payment_date).getTime();
              if (pMs < applyBase) continue;
              const daysElapsed = Math.floor((pMs - applyBase) / 86400000);
              if (daysElapsed > policy.early_pay_days) continue;
              const factor =
                Math.max(0, policy.early_pay_days - daysElapsed) /
                policy.early_pay_days;
              discount += Number(p.amount || 0) * pct * factor;
            }

            discount = Math.round(discount);
            if (discount <= 0) continue;

            records.push({
              building_id: currentBuildingId,
              unit_id: u.id,
              amount: -discount, // negative -> reduces unit's fund debt
              fund_type: fundType,
              month: m,
              year: y,
              description: `تخفیف خوش‌حسابی ${persianMonths[m - 1]} ${y}`,
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
              title: "تخفیف خوش‌حسابی خودکار اعمال شد",
              description: `${records.length} رکورد تخفیف برای ${persianMonths[m - 1]} ${y} ثبت شد.`,
            });
          }
        }
      }
    })();
  }, [currentBuildingId, policy, units, payments, existingCharges, qc]);
}
