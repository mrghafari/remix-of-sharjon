import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2, Trash2, LogIn } from "lucide-react";
import { useAdminCustomers, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useAdmin";
import type { AdminCustomer } from "@/hooks/useAdmin";

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/10 text-primary",
    enterprise: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  };
  const labels: Record<string, string> = { free: "رایگان", pro: "حرفه‌ای", enterprise: "سازمانی" };
  return <Badge className={styles[plan] || styles.free}>{labels[plan] || plan}</Badge>;
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("fa-IR"); } catch { return d; }
}

export function AdminCustomers() {
  const navigate = useNavigate();
  const { data: customers, isLoading } = useAdminCustomers();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [editCustomer, setEditCustomer] = useState<AdminCustomer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCustomer | null>(null);
  const [editPlan, setEditPlan] = useState("free");
  const [editMaxBuildings, setEditMaxBuildings] = useState(1);
  const [editMaxUnits, setEditMaxUnits] = useState(10);

  const openEdit = (c: AdminCustomer) => {
    setEditCustomer(c);
    setEditPlan(c.subscription_plan);
    setEditMaxBuildings(c.max_buildings);
    setEditMaxUnits(c.max_units_per_building);
  };

  const handleSaveEdit = () => {
    if (!editCustomer) return;
    updateCustomer.mutate(
      { userId: editCustomer.user_id, updates: { subscription_plan: editPlan, max_buildings: editMaxBuildings, max_units_per_building: editMaxUnits } },
      { onSuccess: () => setEditCustomer(null) }
    );
  };

  const handleToggleBlock = (c: AdminCustomer) => {
    updateCustomer.mutate({ userId: c.user_id, updates: { is_blocked: !c.is_blocked } });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCustomer.mutate(deleteTarget.user_id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            لیست مشتریان
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !customers?.length ? (
            <p className="text-center text-muted-foreground py-10">هنوز مشتری‌ای ثبت‌نام نکرده است</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>ایمیل</TableHead>
                    <TableHead>پلن</TableHead>
                    <TableHead>ساختمان‌ها</TableHead>
                    <TableHead>واحدها</TableHead>
                    <TableHead>تاریخ عضویت</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                        <TableRow key={c.user_id} className={c.is_blocked ? "opacity-50" : ""}>
                          <TableCell className="font-medium">{c.full_name || "—"}</TableCell>
                          <TableCell className="text-xs ltr">{c.email}</TableCell>
                          <TableCell><PlanBadge plan={c.subscription_plan} /></TableCell>
                          <TableCell>{c.buildings_count.toLocaleString("fa-IR")} / {c.max_buildings.toLocaleString("fa-IR")}</TableCell>
                          <TableCell>{c.total_units.toLocaleString("fa-IR")}</TableCell>
                          <TableCell>{formatDate(c.created_at)}</TableCell>
                          <TableCell>
                            {c.is_blocked ? (
                              <Badge variant="destructive">مسدود</Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-600">فعال</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {c.buildings_count > 0 && (
                                <Button size="sm" variant="default" className="gap-1" onClick={() => navigate(`/admin/customer/${c.user_id}`)}>
                                  <LogIn className="h-4 w-4" />
                                  ورود
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => openEdit(c)}>ویرایش</Button>
                              <Button size="sm" variant={c.is_blocked ? "default" : "destructive"} onClick={() => handleToggleBlock(c)} disabled={updateCustomer.isPending}>
                                {c.is_blocked ? "فعال‌سازی" : "مسدود"}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={(o) => !o && setEditCustomer(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ویرایش مشتری: {editCustomer?.full_name || editCustomer?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>پلن اشتراک</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">رایگان</SelectItem>
                  <SelectItem value="pro">حرفه‌ای</SelectItem>
                  <SelectItem value="enterprise">سازمانی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>حداکثر تعداد ساختمان</Label>
              <Input type="number" min={1} value={editMaxBuildings} onChange={(e) => setEditMaxBuildings(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>حداکثر واحد هر ساختمان</Label>
              <Input type="number" min={1} value={editMaxUnits} onChange={(e) => setEditMaxUnits(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>انصراف</Button>
            <Button onClick={handleSaveEdit} disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف مشتری</DialogTitle>
            <DialogDescription>
              آیا از حذف کامل <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> اطمینان دارید؟
              تمام اطلاعات، ساختمان‌ها و داده‌های این کاربر حذف خواهد شد و قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCustomer.isPending}>
              {deleteCustomer.isPending ? "در حال حذف..." : "حذف کامل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
