import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Calendar,
  ArrowRightLeft,
  Tag,
  X,
} from "lucide-react";
import {
  useManagers,
  useDeleteManager,
  Manager,
} from "@/hooks/useManagers";
import {
  useManagerRoles,
  useCreateManagerRole,
  useDeleteManagerRole,
  ManagerRole,
} from "@/hooks/useManagerRoles";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { useBuilding } from "@/contexts/BuildingContext";
import { ManagerFormDialog } from "./ManagerFormDialog";
import { TransferManagementDialog } from "./TransferManagementDialog";
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

const isActiveManager = (manager: Manager) => {
  if (!manager.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  const startOk = manager.start_date <= today;
  const endOk = !manager.end_date || manager.end_date >= today;
  return startOk && endOk;
};

const personLabel = (m: Manager) =>
  m.role_type === "external"
    ? m.external_name || "مدیر خارجی"
    : `واحد ${m.unit?.unit_number}`;

export function ManagerSettings() {
  const { data: managers = [], isLoading } = useManagers();
  const { data: roles = [], isLoading: rolesLoading } = useManagerRoles();
  const { currentBuilding } = useBuilding();
  const deleteManager = useDeleteManager();
  const createRole = useCreateManagerRole();
  const deleteRole = useDeleteManagerRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [transferRole, setTransferRole] = useState<ManagerRole | null>(null);
  const [showRolesManager, setShowRolesManager] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingManager(null);
    setDialogOpen(true);
  };

  if (isLoading || rolesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const renderManagerCard = (manager: Manager, isPast: boolean) => (
    <div
      key={manager.id}
      className={`p-4 border rounded-lg space-y-3 ${
        !isPast ? "border-primary bg-primary/5" : "bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{personLabel(manager)}</span>
            <Badge
              variant={
                manager.role_type === "owner"
                  ? "default"
                  : manager.role_type === "external"
                  ? "outline"
                  : "secondary"
              }
            >
              {manager.role_type === "owner"
                ? "مالک"
                : manager.role_type === "external"
                ? "خارج از ساختمان"
                : "ساکن"}
            </Badge>
            {!isPast ? (
              <Badge variant="outline" className="text-primary border-primary">
                فعال
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                پایان‌یافته
              </Badge>
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
          <Button variant="outline" size="icon" onClick={() => handleEdit(manager)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDeleteId(manager.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-4 h-4 shrink-0" />
          <span dir="ltr">
            {manager.mobile ||
              (manager.role_type === "owner"
                ? manager.unit?.phone
                : manager.unit?.resident_phone || manager.unit?.phone) ||
              "—"}
          </span>
        </div>
        {manager.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4 shrink-0" />
            <span dir="ltr" className="truncate">
              {manager.email}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>
            از {formatJalaliDate(manager.start_date)}
            {manager.end_date
              ? ` تا ${formatJalaliDate(manager.end_date)}`
              : !isPast
              ? " تا کنون"
              : ""}
          </span>
        </div>
      </div>
    </div>
  );

  // group managers by role
  const managersByRole = (roleId: string) => managers.filter((m) => m.role_id === roleId);
  const unassignedManagers = managers.filter((m) => !m.role_id);

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              مدیریت ساختمان {currentBuilding ? `(${currentBuilding.name})` : ""}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowRolesManager((v) => !v)}
              >
                <Tag className="w-4 h-4" />
                مدیریت نقش‌ها
              </Button>
              <Button onClick={handleAdd} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                افزودن مدیر
              </Button>
            </div>
          </CardHeader>

          {showRolesManager && (
            <CardContent className="border-t pt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <Badge
                    key={r.id}
                    variant="secondary"
                    className="gap-1.5 py-1.5 px-2.5"
                  >
                    {r.label}
                    {!r.is_system && (
                      <button
                        type="button"
                        onClick={() => setDeleteRoleId(r.id)}
                        className="hover:text-destructive"
                        aria-label="حذف نقش"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="عنوان نقش جدید (مثلاً بازرس)"
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (newRoleLabel.trim()) {
                      createRole.mutate(
                        { label: newRoleLabel.trim() },
                        { onSuccess: () => setNewRoleLabel("") }
                      );
                    }
                  }}
                  disabled={!newRoleLabel.trim() || createRole.isPending}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  افزودن
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Per-role sections */}
        {roles.map((role) => {
          const inRole = managersByRole(role.id);
          const active = inRole.find(isActiveManager) || null;

          return (
            <Card key={role.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-primary" />
                  {role.label}
                  {active ? (
                    <Badge variant="outline" className="text-primary border-primary">
                      فعال
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      خالی
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setTransferRole(role)}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  انتقال مدیریت
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {active ? (
                  renderManagerCard(active, false)
                ) : (
                  <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                    در حال حاضر مدیر فعالی برای این نقش ثبت نشده است
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Unassigned active managers */}
        {unassignedManagers.filter(isActiveManager).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                بدون نقش مشخص
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unassignedManagers.filter(isActiveManager).map((m) => renderManagerCard(m, false))}
            </CardContent>
          </Card>
        )}

        {managers.length === 0 && roles.length === 0 && (
          <Card>
            <CardContent className="text-center text-muted-foreground py-8">
              هنوز مدیری ثبت نشده است
            </CardContent>
          </Card>
        )}
      </div>

      <ManagerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        manager={editingManager}
      />

      <TransferManagementDialog
        open={!!transferRole}
        onOpenChange={(o) => !o && setTransferRole(null)}
        role={transferRole}
        currentActive={
          transferRole
            ? managersByRole(transferRole.id).find(isActiveManager) || null
            : null
        }
        candidates={
          transferRole
            ? managers.filter(
                (m) =>
                  m.id !==
                  (managersByRole(transferRole.id).find(isActiveManager)?.id || "")
              )
            : []
        }
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مدیر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این مدیر اطمینان دارید؟ سوابق این مدیر از سیستم پاک خواهد شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteManager.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteRoleId}
        onOpenChange={(open) => !open && setDeleteRoleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف نقش</AlertDialogTitle>
            <AlertDialogDescription>
              با حذف این نقش، مدیران ثبت‌شده در این نقش بدون نقش خواهند شد. ادامه
              می‌دهید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteRoleId) deleteRole.mutate(deleteRoleId);
                setDeleteRoleId(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
