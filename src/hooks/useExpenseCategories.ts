import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AllocationType } from "./useExpenses";

export interface ExpenseCategory {
  id: string;
  name: string;
  label: string;
  icon: string;
  is_system: boolean;
  created_at: string;
}

export interface CategoryWithSettings extends ExpenseCategory {
  allocation_settings?: {
    allowed_allocation_types: AllocationType[];
    default_allocation_type: AllocationType;
  };
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("is_system", { ascending: false })
        .order("created_at");
      
      if (error) throw error;
      return data as ExpenseCategory[];
    },
  });
}

export function useCategoriesWithSettings() {
  return useQuery({
    queryKey: ["categories-with-settings"],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from("expense_categories")
        .select("*")
        .order("is_system", { ascending: false })
        .order("created_at");
      
      if (catError) throw catError;

      const { data: settings, error: settingsError } = await supabase
        .from("category_allocation_settings")
        .select("*");
      
      if (settingsError) throw settingsError;

      return (categories as ExpenseCategory[]).map(cat => ({
        ...cat,
        allocation_settings: settings?.find((s: any) => s.category_id === cat.id) 
          ? {
              allowed_allocation_types: settings.find((s: any) => s.category_id === cat.id)?.allowed_allocation_types || [],
              default_allocation_type: settings.find((s: any) => s.category_id === cat.id)?.default_allocation_type || 'equal',
            }
          : undefined,
      })) as CategoryWithSettings[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, label, icon }: { name: string; label: string; icon: string }) => {
      const { data, error } = await supabase
        .from("expense_categories")
        .insert({ name, label, icon, is_system: false })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-settings"] });
      queryClient.invalidateQueries({ queryKey: ["category-allocation-settings"] });
      toast({ title: "موفق", description: "دسته‌بندی جدید ایجاد شد" });
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast({ title: "خطا", description: "این نام دسته‌بندی قبلاً وجود دارد", variant: "destructive" });
      } else {
        toast({ title: "خطا", description: "خطا در ایجاد دسته‌بندی", variant: "destructive" });
      }
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, label, icon }: { id: string; label: string; icon: string }) => {
      const { data, error } = await supabase
        .from("expense_categories")
        .update({ label, icon })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-settings"] });
      toast({ title: "موفق", description: "دسته‌بندی بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی دسته‌بندی", variant: "destructive" });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-settings"] });
      toast({ title: "حذف شد", description: "دسته‌بندی حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف دسته‌بندی", variant: "destructive" });
    },
  });
}

export function useUpdateCategoryAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      categoryId, 
      allowed_allocation_types, 
      default_allocation_type 
    }: { 
      categoryId: string;
      allowed_allocation_types: AllocationType[];
      default_allocation_type: AllocationType;
    }) => {
      const { data, error } = await supabase
        .from("category_allocation_settings")
        .update({ allowed_allocation_types, default_allocation_type })
        .eq("category_id", categoryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-with-settings"] });
      queryClient.invalidateQueries({ queryKey: ["category-allocation-settings"] });
      toast({ title: "موفق", description: "تنظیمات تسهیم بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی تنظیمات", variant: "destructive" });
    },
  });
}
