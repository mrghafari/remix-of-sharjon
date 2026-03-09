import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Building {
  id: string;
  name: string;
  address: string | null;
  total_units: number | null;
  created_at: string;
  updated_at: string;
}

interface BuildingContextType {
  currentBuildingId: string | null;
  setCurrentBuildingId: (id: string) => void;
  buildings: Building[];
  isLoading: boolean;
  currentBuilding: Building | undefined;
  adminForUserId?: string;
}

const BuildingContext = createContext<BuildingContextType | null>(null);

export function useBuilding() {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error("useBuilding must be used within BuildingProvider");
  return ctx;
}

export function useBuildings() {
  return useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Building[];
    },
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();
  const ctx = useContext(BuildingContext);
  const adminForUserId = ctx?.adminForUserId;

  return useMutation({
    mutationFn: async (building: { name: string; address?: string; total_units?: number }) => {
      if (adminForUserId) {
        // Admin creating building for a specific customer
        const { data, error } = await supabase.rpc("admin_create_building_for_user", {
          _user_id: adminForUserId,
          _name: building.name,
          _address: building.address || null,
          _total_units: building.total_units || null,
        });
        if (error) throw error;
        return { id: data };
      }
      const { error } = await supabase
        .from("buildings")
        .insert(building);
      if (error) throw error;
      return building;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      queryClient.invalidateQueries({ queryKey: ["building_members"] });
      queryClient.invalidateQueries({ queryKey: ["customer_building_ids"] });
      queryClient.invalidateQueries({ queryKey: ["admin_customers"] });
      toast({ title: "موفق", description: "ساختمان با موفقیت اضافه شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در افزودن ساختمان", variant: "destructive" });
    },
  });
}

export function useUpdateBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; address?: string; total_units?: number }) => {
      const { data: result, error } = await supabase
        .from("buildings")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "موفق", description: "ساختمان بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی ساختمان", variant: "destructive" });
    },
  });
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("buildings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      queryClient.invalidateQueries({ queryKey: ["customer_building_ids"] });
      queryClient.invalidateQueries({ queryKey: ["admin_customers"] });
      toast({ title: "حذف شد", description: "ساختمان حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف ساختمان", variant: "destructive" });
    },
  });
}

export function BuildingProvider({ children, filterBuildingIds, adminForUserId }: { children: ReactNode; filterBuildingIds?: string[]; adminForUserId?: string }) {
  const { data: allBuildings = [], isLoading } = useBuildings();
  const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(null);

  const buildings = filterBuildingIds
    ? allBuildings.filter((b) => filterBuildingIds.includes(b.id))
    : allBuildings;

  useEffect(() => {
    if (buildings.length > 0 && !currentBuildingId) {
      const saved = localStorage.getItem("currentBuildingId");
      const found = buildings.find((b) => b.id === saved);
      setCurrentBuildingId(found ? found.id : buildings[0].id);
    }
  }, [buildings, currentBuildingId]);

  const handleSetBuilding = (id: string) => {
    setCurrentBuildingId(id);
    localStorage.setItem("currentBuildingId", id);
  };

  const currentBuilding = buildings.find((b) => b.id === currentBuildingId);

  return (
    <BuildingContext.Provider
      value={{
        currentBuildingId,
        setCurrentBuildingId: handleSetBuilding,
        buildings,
        isLoading,
        currentBuilding,
        adminForUserId,
      }}
    >
      {children}
    </BuildingContext.Provider>
  );
}
