import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCog, Plus, Pencil, Trash2, Phone, Mail, Calendar } from "lucide-react";
import { useManagers, useDeleteManager, Manager } from "@/hooks/useManagers";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { useBuilding } from "@/contexts/BuildingContext";
import { ManagerFormDialog } from "./ManagerFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ManagerSettings() {
  const { data: managers = [], isLoading } = useManagers();
  const { currentBuilding } = useBuilding();
  const deleteManager = useDeleteManager();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingManager(null);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteManager.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const isActiveManager = (manager: Manager) => {
    if (!manager.is_active) return false;
    const today = new Date().toISOString().split("T")[0];
    const startOk = manager.start_date <= today;
    const endOk = !manager.end_date || manager.end_date >= today;
    return startOk && endOk;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            مدیریت ساختمان {currentBuilding ? `(${currentBuilding.name})` : ""}
          </CardTitle>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            افزودن مدیر
          </Button>
        </CardHeader>
        <CardContent>
          {managers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              هنوز مدیری ثبت نشده است
            </div>
          ) : (
            <div className="space-y-4">
              {managers.map((manager) => (
                <div
                  key={manager.id}
                  className={`p-4 border rounded-lg space-y-3 ${
                    isActiveManager(manager) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {manager.role_type === "external"
                            ? manager.external_name || "مدیر خارجی"
                            : `واحد ${manager.unit?.unit_number}`}
                        </span>
                        <Badge variant={manager.role_type === "owner" ? "default" : manager.role_type === "external" ? "outline" : "secondary"}>
                          {manager.role_type === "owner" ? "مالک" : manager.role_type === "external" ? "خارج از ساختمان" : "ساکن"}
                        </Badge>
                        {isActiveManager(manager) && (
                          <Badge variant="outline" className="text-primary border-primary">فعال</Badge>
                        )}
                      </div>
                      {manager.role_type !== "external" && (
                        <div className="text-sm text-muted-foreground">
                          {manager.role_type === "owner"
                            ? manager.unit?.owner_name
                            : manager.unit?.resident_name || manager.unit?.owner_name}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(manager)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeleteId(manager.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {manager.mobile && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {manager.mobile}
                      </div>
                    )}
                    {manager.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {manager.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      از {formatJalaliDate(manager.start_date)}
                      {manager.end_date && ` تا ${formatJalaliDate(manager.end_date)}`}
                    </div>
                  </div>

                  {manager.role_type !== "external" && (
                    <div className="flex gap-4 pt-2 border-t text-sm">
                      <div>
                        <span className="text-muted-foreground">تخفیف شارژ: </span>
                        <span className="font-medium text-primary">
                          {manager.charge_discount_percent}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">تخفیف شارژ اضافی: </span>
                        <span className="font-medium text-primary">
                          {manager.extra_charge_discount_percent}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ManagerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        manager={editingManager}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مدیر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این مدیر اطمینان دارید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
