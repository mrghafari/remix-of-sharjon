import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Building2, Plus, Pencil, Trash2, Loader2, Home } from "lucide-react";
import {
  useBuilding,
  useCreateBuilding,
  useUpdateBuilding,
  useDeleteBuilding,
} from "@/contexts/BuildingContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface BuildingFormData {
  name: string;
  address: string;
  total_units: string;
  vacant_charge_discount_percent: number;
  vacant_extra_charge_discount_percent: number;
}

export function BuildingSettings() {
  const { buildings, isLoading } = useBuilding();
  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const deleteBuilding = useDeleteBuilding();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BuildingFormData>({
    name: "",
    address: "",
    total_units: "",
    vacant_charge_discount_percent: 0,
    vacant_extra_charge_discount_percent: 0,
  });

  const handleAdd = () => {
    setEditId(null);
    setForm({
      name: "",
      address: "",
      total_units: "",
      vacant_charge_discount_percent: 0,
      vacant_extra_charge_discount_percent: 0,
    });
    setDialogOpen(true);
  };

  const handleEdit = (b: any) => {
    setEditId(b.id);
    setForm({
      name: b.name,
      address: b.address || "",
      total_units: b.total_units?.toString() || "",
      vacant_charge_discount_percent: b.vacant_charge_discount_percent || 0,
      vacant_extra_charge_discount_percent: b.vacant_extra_charge_discount_percent || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      address: form.address || undefined,
      total_units: form.total_units ? parseInt(form.total_units) : undefined,
      vacant_charge_discount_percent: form.vacant_charge_discount_percent,
      vacant_extra_charge_discount_percent: form.vacant_extra_charge_discount_percent,
    };

    if (editId) {
      updateBuilding.mutate({ id: editId, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createBuilding.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBuilding.mutate(deleteId);
      setDeleteId(null);
    }
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
            <Building2 className="w-5 h-5" />
            ساختمان‌ها
          </CardTitle>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            افزودن ساختمان
          </Button>
        </CardHeader>
        <CardContent>
          {buildings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              هنوز ساختمانی ثبت نشده است
            </div>
          ) : (
            <div className="space-y-3">
              {buildings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    {b.address && <div className="text-sm text-muted-foreground">{b.address}</div>}
                    {b.total_units && (
                      <div className="text-sm text-muted-foreground">
                        {b.total_units} واحد
                      </div>
                    )}
                    {(b.vacant_charge_discount_percent > 0 || b.vacant_extra_charge_discount_percent > 0) && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Home className="w-3 h-3" />
                        معافیت خالی: شارژ {b.vacant_charge_discount_percent}% | فوق‌شارژ {b.vacant_extra_charge_discount_percent}%
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(b)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleteId(b.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "ویرایش ساختمان" : "افزودن ساختمان"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>نام ساختمان</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: برج آسمان"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>آدرس</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="آدرس ساختمان"
              />
            </div>
            <div className="space-y-2">
              <Label>تعداد واحدها</Label>
              <Input
                type="number"
                value={form.total_units}
                onChange={(e) => setForm({ ...form, total_units: e.target.value })}
                placeholder="تعداد کل واحدها"
              />
            </div>

            {/* Vacant Unit Discount Settings */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Home className="w-4 h-4" />
                معافیت واحدهای خالی
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">معافیت شارژ</Label>
                  <span className="text-sm font-bold text-primary">{form.vacant_charge_discount_percent}%</span>
                </div>
                <Slider
                  value={[form.vacant_charge_discount_percent]}
                  onValueChange={([v]) => setForm({ ...form, vacant_charge_discount_percent: v })}
                  max={100}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">معافیت فوق‌شارژ</Label>
                  <span className="text-sm font-bold text-primary">{form.vacant_extra_charge_discount_percent}%</span>
                </div>
                <Slider
                  value={[form.vacant_extra_charge_discount_percent]}
                  onValueChange={([v]) => setForm({ ...form, vacant_extra_charge_discount_percent: v })}
                  max={100}
                  step={5}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                واحدهای خالی به این درصد از هزینه‌ها معاف می‌شوند و مابقی بین واحدهای دیگر تسهیم می‌شود.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={createBuilding.isPending || updateBuilding.isPending}>
              {(createBuilding.isPending || updateBuilding.isPending) && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {editId ? "بروزرسانی" : "ثبت ساختمان"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف ساختمان</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این ساختمان اطمینان دارید؟ تمام اطلاعات مرتبط نیز حذف خواهد شد.
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
