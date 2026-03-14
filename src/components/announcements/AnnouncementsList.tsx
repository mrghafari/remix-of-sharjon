import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pin, Trash2, Pencil, Bell, Loader2 } from "lucide-react";
import { formatJalaliDate } from "@/lib/jalaliDate";

interface Announcement {
  id: string;
  building_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function AnnouncementsList() {
  const { currentBuildingId } = useBuilding();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["building-announcements", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await (supabase as any)
        .from("building_announcements")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Announcement[]) || [];
    },
    enabled: !!currentBuildingId,
  });

  const openCreate = () => {
    setEditItem(null);
    setTitle("");
    setContent("");
    setIsPinned(false);
    setFormOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditItem(a);
    setTitle(a.title);
    setContent(a.content);
    setIsPinned(a.is_pinned);
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();
      if (!trimmedTitle || !trimmedContent || !currentBuildingId) return;

      if (editItem) {
        const { error } = await (supabase as any)
          .from("building_announcements")
          .update({ title: trimmedTitle, content: trimmedContent, is_pinned: isPinned })
          .eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { error } = await (supabase as any).from("building_announcements").insert({
          building_id: currentBuildingId,
          title: trimmedTitle,
          content: trimmedContent,
          is_pinned: isPinned,
          created_by: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-announcements", currentBuildingId] });
      toast({ title: editItem ? "اعلان ویرایش شد" : "اعلان ایجاد شد" });
      setFormOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("building_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-announcements", currentBuildingId] });
      toast({ title: "اعلان حذف شد" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "خطا در حذف", description: err.message, variant: "destructive" });
    },
  });

  if (!currentBuildingId) return null;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          اعلان جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>هنوز اعلانی ثبت نشده است</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={a.is_pinned ? "border-primary/40 bg-primary/5" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && <Pin className="w-4 h-4 text-primary" />}
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {a.is_pinned && <Badge variant="secondary" className="text-xs">سنجاق شده</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {formatJalaliDate(a.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editItem ? "ویرایش اعلان" : "اعلان جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>متن اعلان</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={2000} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
              <Label>سنجاق کردن (نمایش در بالا)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || !content.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف اعلان</AlertDialogTitle>
            <AlertDialogDescription>آیا از حذف این اعلان اطمینان دارید؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
