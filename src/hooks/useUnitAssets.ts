import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useBuilding } from "@/contexts/BuildingContext";

export interface UnitStorage {
  id: string;
  building_id: string;
  unit_id: string;
  storage_number: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitVehicle {
  id: string;
  building_id: string;
  unit_id: string;
  plate_part1: string;
  plate_letter: string;
  plate_part2: string;
  plate_city: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useUnitStorages(unitId?: string | null) {
  return useQuery({
    queryKey: ["unit-storages", unitId],
    queryFn: async () => {
      if (!unitId) return [] as UnitStorage[];
      const { data, error } = await (supabase as any)
        .from("unit_storages")
        .select("*")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as UnitStorage[];
    },
    enabled: !!unitId,
  });
}

export function useUnitVehicles(unitId?: string | null) {
  return useQuery({
    queryKey: ["unit-vehicles", unitId],
    queryFn: async () => {
      if (!unitId) return [] as UnitVehicle[];
      const { data, error } = await (supabase as any)
        .from("unit_vehicles")
        .select("*")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as UnitVehicle[];
    },
    enabled: !!unitId,
  });
}

export function useCreateUnitStorage() {
  const qc = useQueryClient();
  const { currentBuildingId } = useBuilding();
  return useMutation({
    mutationFn: async (payload: { unit_id: string; storage_number: string; description?: string | null }) => {
      const { data, error } = await (supabase as any)
        .from("unit_storages")
        .insert({ ...payload, building_id: currentBuildingId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["unit-storages", v.unit_id] });
      toast({ title: "موفق", description: "انبار اضافه شد" });
    },
    onError: () => toast({ title: "خطا", description: "خطا در ثبت انبار", variant: "destructive" }),
  });
}

export function useDeleteUnitStorage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: UnitStorage) => {
      const { error } = await (supabase as any).from("unit_storages").delete().eq("id", item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["unit-storages", item.unit_id] });
      toast({ title: "حذف شد", description: "انبار حذف شد" });
    },
    onError: () => toast({ title: "خطا", description: "خطا در حذف", variant: "destructive" }),
  });
}

export function useCreateUnitVehicle() {
  const qc = useQueryClient();
  const { currentBuildingId } = useBuilding();
  return useMutation({
    mutationFn: async (payload: {
      unit_id: string;
      plate_part1: string;
      plate_letter: string;
      plate_part2: string;
      plate_city: string;
      description?: string | null;
    }) => {
      const { data, error } = await (supabase as any)
        .from("unit_vehicles")
        .insert({ ...payload, building_id: currentBuildingId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["unit-vehicles", v.unit_id] });
      toast({ title: "موفق", description: "خودرو اضافه شد" });
    },
    onError: () => toast({ title: "خطا", description: "خطا در ثبت خودرو", variant: "destructive" }),
  });
}

export function useDeleteUnitVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: UnitVehicle) => {
      const { error } = await (supabase as any).from("unit_vehicles").delete().eq("id", item.id);
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["unit-vehicles", item.unit_id] });
      toast({ title: "حذف شد", description: "خودرو حذف شد" });
    },
    onError: () => toast({ title: "خطا", description: "خطا در حذف", variant: "destructive" }),
  });
}

export function useUpdateUnitStorage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; unit_id: string; storage_number: string; description?: string | null }) => {
      const { id, unit_id, ...rest } = payload;
      const { error } = await (supabase as any)
        .from("unit_storages")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
      return payload;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["unit-storages", p.unit_id] });
      toast({ title: "ذخیره شد", description: "انبار ویرایش شد" });
    },
    onError: () => toast({ title: "خطا", description: "خطا در ویرایش", variant: "destructive" }),
  });
}

export function useUpdateUnitVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      unit_id: string;
      plate_part1: string;
      plate_letter: string;
      plate_part2: string;
      plate_city: string;
      description?: string | null;
    }) => {
      const { id, unit_id, ...rest } = payload;
      const { error } = await (supabase as any)
        .from("unit_vehicles")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
      return payload;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["unit-vehicles", p.unit_id] });
      toast({ title: "ذخیره شد", description: "خودرو ویرایش شد" });
    },
    onError: () => toast({ title: "خطا", description: "خطا در ویرایش", variant: "destructive" }),
  });
}

export const IRAN_PLATE_LETTERS = [
  "الف","ب","پ","ت","ث","ج","د","س","ش","ص","ط","ع","ف","ق","ک","گ","ل","م","ن","و","ه","ی","D","S",
];
