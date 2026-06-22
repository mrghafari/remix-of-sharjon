import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBuilding } from "@/contexts/BuildingContext";
import { useUnits } from "./useUnits";
import { useActiveManager } from "./useManagers";
import type { AllocationType, FundType, Expense } from "./useExpenses";
import {
  calculateAllUnitAllocations,
  type ManagerDiscount,
  type VacantDiscount,
} from "./useUnitBalanceFiltered";

export interface UnitCharge {
  id: string;
  building_id: string;
  unit_id: string;
  amount: number;
  fund_type: FundType;
  month: number;
  year: number;
  description: string | null;
  owner_name: string | null;
  resident_name: string | null;
  created_at: string;
  paid_amount?: number | null;
  paid_at?: string | null;
}

export function useUnitCharges() {
  const { currentBuildingId } = useBuilding();

  return useQuery({
    queryKey: ["unit-charges", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("unit_charges")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UnitCharge[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useApplyCharges() {
  const queryClient = useQueryClient();
  const { currentBuildingId, currentBuilding } = useBuilding();
  const { data: units = [] } = useUnits();
  const { data: activeManager } = useActiveManager();
  const { data: existingCharges = [] } = useUnitCharges();



  return useMutation({
    mutationFn: async ({
      chargeAmount,
      extraChargeAmount,
      month,
      year,
      description,
      chargeDescription,
      extraChargeDescription,
    }: {
      chargeAmount: number;
      extraChargeAmount: number;
      month: number;
      year: number;
      description?: string;
      chargeDescription?: string;
      extraChargeDescription?: string;
    }) => {
      if (!currentBuildingId || units.length === 0) {
        throw new Error("ساختمان یا واحدی یافت نشد");
      }

      const vacantChargeDiscount = currentBuilding?.vacant_charge_discount_percent || 0;
      const vacantExtraDiscount = currentBuilding?.vacant_extra_charge_discount_percent || 0;
      const managerUnitId = activeManager?.unit_id;
      const managerChargeDiscount = activeManager?.charge_discount_percent || 0;
      const managerExtraDiscount = activeManager?.extra_charge_discount_percent || 0;

      const managerDiscount: ManagerDiscount | null = managerUnitId
        ? {
            unitId: managerUnitId,
            chargeDiscountPercent: managerChargeDiscount,
            extraChargeDiscountPercent: managerExtraDiscount,
          }
        : null;
      const vacantDiscount: VacantDiscount | null =
        vacantChargeDiscount === 0 && vacantExtraDiscount === 0
          ? null
          : {
              chargeDiscountPercent: vacantChargeDiscount,
              extraChargeDiscountPercent: vacantExtraDiscount,
            };

      const records: {
        building_id: string;
        unit_id: string;
        amount: number;
        fund_type: FundType;
        month: number;
        year: number;
        description: string | null;
        owner_name: string | null;
        resident_name: string | null;
      }[] = [];

      const applyForFund = (totalAmount: number, fundType: FundType) => {
        if (totalAmount <= 0) return;

        // Existing charges (skip units already charged for the period)
        const existingSet = new Set(
          (existingCharges as any[])
            .filter(
              (c) => c.month === month && c.year === year && c.fund_type === fundType
            )
            .map((c) => c.unit_id)
        );

        const fundDescription =
          fundType === "charge"
            ? chargeDescription || description || null
            : extraChargeDescription || description || null;

        const allocationType: AllocationType =
          (fundType === "charge"
            ? (currentBuilding?.charge_allocation_type as AllocationType)
            : (currentBuilding?.extra_charge_allocation_type as AllocationType)) ||
          "equal";
        const areaRatio =
          (fundType === "charge"
            ? currentBuilding?.charge_area_ratio
            : currentBuilding?.extra_charge_area_ratio) ?? 50;

        // Build a synthetic "expense" representing the total to allocate
        const syntheticExpense = {
          id: "synthetic",
          building_id: currentBuildingId,
          amount: totalAmount,
          fund_type: fundType,
          allocation_type: allocationType,
          area_ratio: areaRatio,
          unit_id: null,
          project_id: null,
        } as unknown as Expense;

        const allocations = calculateAllUnitAllocations(
          syntheticExpense,
          units as any,
          managerDiscount,
          vacantDiscount,
          null
        );

        units.forEach((unit) => {
          if (existingSet.has(unit.id)) return;
          const amount = allocations.get(unit.id) || 0;
          if (amount > 0) {
            records.push({
              building_id: currentBuildingId,
              unit_id: unit.id,
              amount: Math.round(amount),
              fund_type: fundType,
              month,
              year,
              description: fundDescription,
              owner_name: unit.owner_name || null,
              resident_name: unit.resident_name || null,
            });
          }
        });
      };

      applyForFund(chargeAmount, "charge");
      applyForFund(extraChargeAmount, "extra_charge");

      if (records.length === 0) {
        throw new Error("همه واحدها قبلاً برای این دوره شارژ شده‌اند");
      }


      const { error } = await supabase.from("unit_charges").insert(records);
      if (error) throw error;

      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["unit-charges"] });
      toast({
        title: "موفق",
        description: `شارژ برای ${count} رکورد با موفقیت اعمال شد`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error?.message || "خطا در اعمال شارژ",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteUnitCharge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unit_charges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-charges"] });
      toast({ title: "حذف شد", description: "بدهی حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف بدهی", variant: "destructive" });
    },
  });
}
