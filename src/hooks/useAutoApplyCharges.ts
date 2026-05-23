import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { format, endOfMonth, getDate } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { toast } from "@/hooks/use-toast";

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/**
 * Runs once per session when the app loads.
 * For every building the user manages with auto_charge_enabled = true,
 * if today's Jalali day has reached the configured day (or it's the last day
 * of a short month) and no charges have been applied yet for the current
 * Jalali month, automatically apply the default charge & extra charge.
 */
export function useAutoApplyCharges() {
  const { buildings } = useBuilding();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (!buildings || buildings.length === 0) return;
    ranRef.current = true;

    (async () => {
      const now = new Date();
      const jYear = Number(format(now, "yyyy", { locale: faIR }));
      const jMonth = Number(format(now, "M", { locale: faIR }));
      const jDay = Number(format(now, "d", { locale: faIR }));
      const lastDayOfMonth = getDate(endOfMonth(now));

      let appliedCount = 0;

      for (const b of buildings) {
        if (!b.auto_charge_enabled) continue;
        const chargeAmt = Number(b.default_charge_amount) || 0;
        const extraAmt = Number(b.default_extra_charge_amount) || 0;
        if (chargeAmt <= 0 && extraAmt <= 0) continue;

        const configuredDay = Math.max(1, Math.min(31, Number(b.auto_charge_day) || 1));
        const effectiveDay = Math.min(configuredDay, lastDayOfMonth);
        if (jDay < effectiveDay) continue;

        // Check if already applied for this month
        const fundTypes: ("charge" | "extra_charge")[] = [];
        if (chargeAmt > 0) fundTypes.push("charge");
        if (extraAmt > 0) fundTypes.push("extra_charge");

        const { data: existing } = await supabase
          .from("unit_charges")
          .select("id")
          .eq("building_id", b.id)
          .eq("month", jMonth)
          .eq("year", jYear)
          .in("fund_type", fundTypes)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Load units & active manager
        const [{ data: units }, { data: managers }] = await Promise.all([
          supabase.from("units").select("*").eq("building_id", b.id),
          supabase
            .from("managers")
            .select("unit_id,charge_discount_percent,extra_charge_discount_percent")
            .eq("building_id", b.id)
            .eq("is_active", true)
            .lte("start_date", new Date().toISOString().slice(0, 10)),
        ]);

        if (!units || units.length === 0) continue;

        const mgr = (managers || []).find((m) => m.unit_id);
        const vacantChargeDisc = b.vacant_charge_discount_percent || 0;
        const vacantExtraDisc = b.vacant_extra_charge_discount_percent || 0;
        const mgrUnitId = mgr?.unit_id;
        const mgrChargeDisc = mgr?.charge_discount_percent || 0;
        const mgrExtraDisc = mgr?.extra_charge_discount_percent || 0;

        const monthLabel = `${JALALI_MONTHS[jMonth - 1]} ${jYear}`;
        const records: any[] = [];

        const buildRecords = (baseAmount: number, fundType: "charge" | "extra_charge") => {
          if (baseAmount <= 0) return;
          const vacantDisc = fundType === "charge" ? vacantChargeDisc : vacantExtraDisc;
          const mDisc = fundType === "charge" ? mgrChargeDisc : mgrExtraDisc;
          const desc = (fundType === "charge" ? "شارژ " : "فوق‌شارژ ") + monthLabel + " (اعمال خودکار)";

          units.forEach((u: any) => {
            let amount = baseAmount;
            if (!u.is_occupied && vacantDisc > 0) amount = amount * (1 - vacantDisc / 100);
            if (mgrUnitId && u.id === mgrUnitId && mDisc > 0) amount = amount * (1 - mDisc / 100);
            if (amount > 0) {
              records.push({
                building_id: b.id,
                unit_id: u.id,
                amount: Math.round(amount),
                fund_type: fundType,
                month: jMonth,
                year: jYear,
                description: desc,
                owner_name: u.owner_name || null,
                resident_name: u.resident_name || null,
              });
            }
          });
        };

        buildRecords(chargeAmt, "charge");
        buildRecords(extraAmt, "extra_charge");

        if (records.length === 0) continue;

        const { error } = await supabase.from("unit_charges").insert(records);
        if (!error) {
          appliedCount += records.length;
        }
      }

      if (appliedCount > 0) {
        toast({
          title: "اعمال خودکار شارژ",
          description: `${appliedCount} رکورد شارژ ماه جاری به صورت خودکار اعمال شد`,
        });
      }
    })();
  }, [buildings]);
}
