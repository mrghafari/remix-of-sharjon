import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminLookupUser, AdminLookupUser } from "@/hooks/useAdmin";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  buildingName: string;
}

export function AssignManagerDialog({ open, onOpenChange, buildingId, buildingName }: Props) {
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data: users, isFetching } = useAdminLookupUser(query);
  const queryClient = useQueryClient();

  const handleAssign = async (u: AdminLookupUser) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("admin_reassign_building", {
        _building_id: buildingId,
        _new_user_id: u.user_id,
      });
      if (error) throw error;
      toast({ title: "موفق", description: `${u.full_name || u.email} به عنوان مدیر ساختمان «${buildingName}» تعیین شد` });
      queryClient.invalidateQueries({ queryKey: ["admin_buildings"] });
      queryClient.invalidateQueries({ queryKey: ["admin_customers"] });
      onOpenChange(false);
      setQuery("");
    } catch (e: any) {
      toast({ title: "خطا", description: e.message || "خطا در اختصاص مدیر", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            اختصاص مدیر به ساختمان «{buildingName}»
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="جستجو با نام، ایمیل یا موبایل (حداقل ۳ کاراکتر)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
            {isFetching ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !users?.length ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                {query.trim().length < 3 ? "حداقل ۳ کاراکتر وارد کنید" : "کاربری یافت نشد"}
              </p>
            ) : (
              users.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50">
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-medium truncate">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground ltr truncate">{u.email}</div>
                    {u.phone && <div className="text-xs text-muted-foreground ltr">{u.phone}</div>}
                  </div>
                  <Button size="sm" disabled={submitting} onClick={() => handleAssign(u)}>
                    اختصاص
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>بستن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
