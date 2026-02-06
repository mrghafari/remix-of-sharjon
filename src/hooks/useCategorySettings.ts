import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AllocationType } from "./useExpenses";
import type { Database } from "@/integrations/supabase/types";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

export interface CategoryAllocationSetting {
  id: string;
  category: ExpenseCategory;
  allowed_allocation_types: AllocationType[];
  default_allocation_type: AllocationType;
  created_at: string;
  updated_at: string;
}

export function useCategorySettings() {
  return useQuery({
    queryKey: ["category-allocation-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_allocation_settings")
        .select("*")
        .order("category");
      
      if (error) throw error;
      return data as CategoryAllocationSetting[];
    },
  });
}

export function useCategorySettingByCategory(category: ExpenseCategory | "") {
  const { data: settings } = useCategorySettings();
  
  if (!category || !settings) return null;
  return settings.find(s => s.category === category) || null;
}

export function useUpdateCategorySetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      category, 
      allowed_allocation_types, 
      default_allocation_type 
    }: { 
      category: ExpenseCategory;
      allowed_allocation_types: AllocationType[];
      default_allocation_type: AllocationType;
    }) => {
      const { data, error } = await supabase
        .from("category_allocation_settings")
        .update({ 
          allowed_allocation_types, 
          default_allocation_type 
        })
        .eq("category", category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-allocation-settings"] });
      toast({ title: "موفق", description: "تنظیمات دسته‌بندی بروزرسانی شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در بروزرسانی تنظیمات", variant: "destructive" });
    },
  });
}
