import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBuilding } from "@/contexts/BuildingContext";

export interface Project {
  id: string;
  building_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  is_active: boolean;
  apply_manager_discount: boolean;
  manager_charge_discount_percent: number;
  manager_extra_charge_discount_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  is_active?: boolean;
  apply_manager_discount?: boolean;
  manager_charge_discount_percent?: number;
  manager_extra_charge_discount_percent?: number;
}

export function useProjects() {
  const { currentBuildingId } = useBuilding();
  
  return useQuery({
    queryKey: ["projects", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useActiveProjects() {
  const { currentBuildingId } = useBuilding();
  
  return useQuery({
    queryKey: ["projects", "active", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("building_id", currentBuildingId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();

  return useMutation({
    mutationFn: async (project: ProjectInsert) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...project, building_id: currentBuildingId! })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("پروژه با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error("خطا در ثبت پروژه: " + error.message);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("پروژه با موفقیت به‌روزرسانی شد");
    },
    onError: (error) => {
      toast.error("خطا در به‌روزرسانی پروژه: " + error.message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("پروژه با موفقیت حذف شد");
    },
    onError: (error) => {
      toast.error("خطا در حذف پروژه: " + error.message);
    },
  });
}
