import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";

export interface PaymentPolicy {
  id: string;
  building_id: string;
  early_pay_enabled: boolean;
  early_pay_days: number;
  early_pay_discount_percent: number;
  late_penalty_enabled: boolean;
  late_grace_days: number;
  late_penalty_percent_per_month: number;
  late_penalty_max_months: number;
}

export function usePaymentPolicy() {
  const { currentBuildingId } = useBuilding();
  return useQuery({
    queryKey: ["building_payment_policies", currentBuildingId],
    enabled: !!currentBuildingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_payment_policies")
        .select("*")
        .eq("building_id", currentBuildingId!)
        .maybeSingle();
      if (error) throw error;
      return (data as PaymentPolicy | null) ?? null;
    },
  });
}
