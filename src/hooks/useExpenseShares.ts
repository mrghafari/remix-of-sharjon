import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";

export interface ExpenseShare {
  id: string;
  expense_id: string;
  unit_id: string;
  building_id: string;
  allocated_amount: number;
  created_at: string;
}

export function useExpenseShares() {
  const { currentBuildingId } = useBuilding();

  return useQuery({
    queryKey: ["expense-unit-shares", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("expense_unit_shares")
        .select("*")
        .eq("building_id", currentBuildingId);

      if (error) throw error;
      return data as ExpenseShare[];
    },
    enabled: !!currentBuildingId,
  });
}
