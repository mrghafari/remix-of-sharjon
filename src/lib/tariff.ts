import { supabase } from "@/integrations/supabase/client";
import type { PricingPlanConfig } from "@/components/admin/AdminPricingSettings";
import { DEFAULT_PRICING } from "@/components/admin/AdminPricingSettings";

// Convert Persian/Arabic digits to ASCII and parse to number.
export function parsePersianNumber(s: string | number | null | undefined): number {
  if (s == null) return 0;
  if (typeof s === "number") return s;
  const map: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  const ascii = s.replace(/[۰-۹٠-٩]/g, (c) => map[c] ?? c).replace(/[^\d.]/g, "");
  const n = Number(ascii);
  return isNaN(n) ? 0 : n;
}

// Tariff stored as "thousand Rial per unit per year".
// Returns Rial per unit per year.
export function tariffPerUnitRial(plan: PricingPlanConfig): number {
  if (plan.contact) return 0;
  return Math.round(parsePersianNumber(plan.price) * 1000);
}

export async function loadPricingPlans(): Promise<PricingPlanConfig[]> {
  const { data } = await supabase
    .from("platform_settings")
    .select("setting_value")
    .eq("setting_key", "pricing_plans")
    .maybeSingle();
  const arr = (data?.setting_value as any)?.plans;
  return Array.isArray(arr) ? arr : DEFAULT_PRICING;
}

export function tariffForTier(plans: PricingPlanConfig[], tierKey: string | null): PricingPlanConfig | null {
  if (!tierKey) return null;
  const idx = tierKey === "free" ? 0 : tierKey === "pro" ? 1 : tierKey === "enterprise" ? 2 : -1;
  if (idx < 0 || idx >= plans.length) return null;
  return plans[idx];
}
