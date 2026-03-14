import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useToast } from "@/hooks/use-toast";

export interface Contact {
  id: string;
  building_id: string;
  name: string;
  phone: string;
  specialty: string;
  rating: number;
  description: string | null;
  created_at: string;
}

export function useContacts() {
  const { currentBuildingId } = useBuilding();
  return useQuery({
    queryKey: ["building_contacts", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("building_contacts" as any)
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Contact[];
    },
    enabled: !!currentBuildingId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (contact: Omit<Contact, "id" | "created_at">) => {
      const { error } = await supabase
        .from("building_contacts" as any)
        .insert(contact as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building_contacts"] });
      toast({ title: "موفق", description: "مخاطب اضافه شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در افزودن مخاطب", variant: "destructive" });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Contact> & { id: string }) => {
      const { error } = await supabase
        .from("building_contacts" as any)
        .update(data as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building_contacts"] });
      toast({ title: "موفق", description: "مخاطب ویرایش شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در ویرایش مخاطب", variant: "destructive" });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("building_contacts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building_contacts"] });
      toast({ title: "موفق", description: "مخاطب حذف شد" });
    },
    onError: () => {
      toast({ title: "خطا", description: "خطا در حذف مخاطب", variant: "destructive" });
    },
  });
}
