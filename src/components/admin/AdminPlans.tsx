import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useSubscriptionPlans, usePlanMutations, type SubscriptionPlan } from "@/hooks/useSubscription";
import { Textarea } from "@/components/ui/textarea";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

export function AdminPlans() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { create, update, remove } = usePlanMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState({
    name: "", unit_quota: 20, duration_days: 365, price_rial: 0,
    description: "", is_active: true, sort_order: 0,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", unit_quota: 20, duration_days: 365, price_rial: 0, description: "", is_active: true, sort_order: (plans?.length ?? 0) + 1 });
    setOpen(true);
  };
  const openEdit = (p: SubscriptionPlan) => {
    setEditing(p);
    setForm({
      name: p.name, unit_quota: p.unit_quota, duration_days: p.duration_days,
      price_rial: p.price_rial, description: p.description ?? "",
      is_active: p.is_active, sort_order: p.sort_order,
    });
    setOpen(true);
  };

  const handleSave = () => {
    const payload = { ...form };
    if (editing) update.mutate({ id: editing.id, ...payload }, { onSuccess: () => setOpen(false) });
    else create.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>پلن‌های اشتراک</CardTitle>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" /> پلن جدید</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>سقف واحد</TableHead>
                <TableHead>مدت (روز)</TableHead>
                <TableHead>قیمت (ریال)</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{fmt(p.unit_quota)}</TableCell>
                  <TableCell>{fmt(p.duration_days)}</TableCell>
                  <TableCell>{fmt(p.price_rial)}</TableCell>
                  <TableCell>{p.is_active ? "فعال" : "غیرفعال"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                        if (confirm(`حذف پلن "${p.name}"؟`)) remove.mutate(p.id);
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "ویرایش پلن" : "پلن جدید"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>نام پلن</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>سقف واحد</Label><Input type="number" value={form.unit_quota} onChange={(e) => setForm({ ...form, unit_quota: +e.target.value })} /></div>
              <div><Label>مدت (روز)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: +e.target.value })} /></div>
            </div>
            <div><Label>قیمت (ریال)</Label><Input type="number" value={form.price_rial} onChange={(e) => setForm({ ...form, price_rial: +e.target.value })} /></div>
            <div><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div><Label>ترتیب</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>فعال</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending || !form.name}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
