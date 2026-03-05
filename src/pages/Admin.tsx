import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin, useAdminStats, useAdminCustomers, useUpdateCustomer } from "@/hooks/useAdmin";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Building2, Home, Ban, Crown, Shield, ArrowRight, Loader2 } from "lucide-react";
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

export default function Admin() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: isSuperAdmin, isLoading: roleLoading } = useIsSuperAdmin();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: customers, isLoading: customersLoading } = useAdminCustomers();
  const updateCustomer = useUpdateCustomer();

  const [editCustomer, setEditCustomer] = useState<AdminCustomer | null>(null);
  const [editPlan, setEditPlan] = useState("free");
  const [editMaxBuildings, setEditMaxBuildings] = useState(1);
  const [editMaxUnits, setEditMaxUnits] = useState(10);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const openEdit = (c: AdminCustomer) => {
    setEditCustomer(c);
    setEditPlan(c.subscription_plan);
    setEditMaxBuildings(c.max_buildings);
    setEditMaxUnits(c.max_units_per_building);
  };

  const handleSaveEdit = () => {
    if (!editCustomer) return;
    updateCustomer.mutate(
      {
        userId: editCustomer.user_id,
        updates: {
          subscription_plan: editPlan,
          max_buildings: editMaxBuildings,
          max_units_per_building: editMaxUnits,
        },
      },
      { onSuccess: () => setEditCustomer(null) }
    );
  };

  const handleToggleBlock = (c: AdminCustomer) => {
    updateCustomer.mutate({
      userId: c.user_id,
      updates: { is_blocked: !c.is_blocked },
    });
  };

  const statCards = [
    { title: "کل کاربران", value: stats?.total_users ?? 0, icon: Users, color: "text-primary" },
    { title: "کل ساختمان‌ها", value: stats?.total_buildings ?? 0, icon: Building2, color: "text-emerald-600" },
    { title: "کل واحدها", value: stats?.total_units ?? 0, icon: Home, color: "text-blue-600" },
    { title: "مسدود شده", value: stats?.blocked_users ?? 0, icon: Ban, color: "text-destructive" },
  ];

  const planCards = [
    { title: "رایگان", value: stats?.free_users ?? 0, icon: Users },
    { title: "حرفه‌ای", value: stats?.pro_users ?? 0, icon: Crown },
    { title: "سازمانی", value: stats?.enterprise_users ?? 0, icon: Shield },
  ];

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("fa-IR");
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold">پنل مدیریت پلتفرم</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowRight className="h-4 w-4 ml-1" />
                داشبورد
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.title}</p>
                    <p className="text-3xl font-bold mt-1">
                      {statsLoading ? "..." : s.value.toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plan distribution */}
        <div className="grid grid-cols-3 gap-4">
          {planCards.map((p) => (
            <Card key={p.title}>
              <CardContent className="pt-6 text-center">
                <p.icon className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">{p.title}</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : p.value.toLocaleString("fa-IR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customers table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              لیست مشتریان
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
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
                        <TableCell>
                          {c.buildings_count.toLocaleString("fa-IR")} / {c.max_buildings.toLocaleString("fa-IR")}
                        </TableCell>
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
                            <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                              ویرایش
                            </Button>
                            <Button
                              size="sm"
                              variant={c.is_blocked ? "default" : "destructive"}
                              onClick={() => handleToggleBlock(c)}
                              disabled={updateCustomer.isPending}
                            >
                              {c.is_blocked ? "فعال‌سازی" : "مسدود"}
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
      </main>

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
              <Input
                type="number"
                min={1}
                value={editMaxBuildings}
                onChange={(e) => setEditMaxBuildings(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>حداکثر واحد هر ساختمان</Label>
              <Input
                type="number"
                min={1}
                value={editMaxUnits}
                onChange={(e) => setEditMaxUnits(Number(e.target.value))}
              />
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
    </div>
  );
}
