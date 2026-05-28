import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Inbox, Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatJalaliDate } from "@/lib/jalaliDate";

function formatToman(n: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n)) + " ریال";
}

function formatJalaliDateTime(iso: string) {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${formatJalaliDate(iso)} ${time}`;
}

interface SmsPackage {
  id: string;
  package_count: number;
  price: number;
  label: string | null;
  is_active: boolean;
  sort_order: number;
}

export function AdminSmsPackages() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<SmsPackage> | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["admin_sms_packages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sms_packages")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as SmsPackage[];
    },
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["admin_sms_credit_requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sms_credit_requests")
        .select("*, buildings(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const savePackage = useMutation({
    mutationFn: async (pkg: Partial<SmsPackage>) => {
      if (pkg.id) {
        const { error } = await (supabase as any)
          .from("sms_packages")
          .update({
            package_count: pkg.package_count,
            price: pkg.price,
            label: pkg.label,
            is_active: pkg.is_active,
            sort_order: pkg.sort_order,
          })
          .eq("id", pkg.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("sms_packages").insert({
          package_count: pkg.package_count,
          price: pkg.price,
          label: pkg.label,
          is_active: pkg.is_active ?? true,
          sort_order: pkg.sort_order ?? 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_sms_packages"] });
      qc.invalidateQueries({ queryKey: ["sms_packages_active"] });
      setEditing(null);
      toast({ title: "ذخیره شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("sms_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_sms_packages"] });
      qc.invalidateQueries({ queryKey: ["sms_packages_active"] });
      toast({ title: "حذف شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });

  const reviewRequest = useMutation({
    mutationFn: async ({ id, status, admin_note }: { id: string; status: string; admin_note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("sms_credit_requests")
        .update({
          status,
          admin_note: admin_note ?? null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_sms_credit_requests"] });
      toast({ title: "وضعیت درخواست بروزرسانی شد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;

  return (
    <div className="space-y-6" dir="rtl">
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <Inbox className="w-4 h-4" />
            درخواست‌های خرید
            {pendingCount > 0 && <Badge variant="destructive" className="mr-1">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-2">
            <Package className="w-4 h-4" />
            مدیریت بسته‌ها
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>درخواست‌های خرید بسته پیامک</CardTitle>
              <CardDescription>{requests.length} درخواست از همه ساختمان‌ها</CardDescription>
            </CardHeader>
            <CardContent>
              {reqLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>تاریخ</TableHead>
                        <TableHead>ساختمان</TableHead>
                        <TableHead>تعداد بسته</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>توضیحات مدیر</TableHead>
                        <TableHead>پاسخ ادمین</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">درخواستی ثبت نشده است</TableCell></TableRow>
                      )}
                      {requests.map((r: any) => (
                        <RequestRow key={r.id} request={r} onReview={reviewRequest.mutate} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>بسته‌های پیامک</CardTitle>
                <CardDescription>مدیریت بسته‌ها و قیمت‌گذاری</CardDescription>
              </div>
              <Button onClick={() => setEditing({ is_active: true, sort_order: packages.length + 1 })}>
                <Plus className="w-4 h-4 ml-1" /> بسته جدید
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ترتیب</TableHead>
                        <TableHead>تعداد پیامک</TableHead>
                        <TableHead>قیمت</TableHead>
                        <TableHead>برچسب</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.sort_order}</TableCell>
                          <TableCell className="font-bold">{new Intl.NumberFormat("fa-IR").format(p.package_count)}</TableCell>
                          <TableCell>{formatToman(Number(p.price))}</TableCell>
                          <TableCell>{p.label || "-"}</TableCell>
                          <TableCell>
                            {p.is_active ? <Badge>فعال</Badge> : <Badge variant="secondary">غیرفعال</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => {
                                if (confirm("آیا از حذف این بسته مطمئن هستید؟")) deletePackage.mutate(p.id);
                              }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
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
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "ویرایش بسته" : "بسته جدید"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>تعداد پیامک</Label>
                <Input
                  type="number"
                  value={editing.package_count ?? ""}
                  onChange={(e) => setEditing({ ...editing, package_count: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>قیمت (ریال)</Label>
                <Input
                  type="number"
                  value={editing.price ?? ""}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>برچسب (اختیاری - مثلاً «پرفروش»)</Label>
                <Input
                  value={editing.label ?? ""}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                />
              </div>
              <div>
                <Label>ترتیب نمایش</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>فعال</Label>
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>انصراف</Button>
            <Button
              onClick={() => editing && savePackage.mutate(editing)}
              disabled={savePackage.isPending || !editing?.package_count || !editing?.price}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestRow({ request: r, onReview }: { request: any; onReview: (p: any) => void }) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs">{formatJalaliDateTime(r.created_at)}</TableCell>
      <TableCell>{r.buildings?.name ?? "-"}</TableCell>
      <TableCell>{new Intl.NumberFormat("fa-IR").format(r.package_count)} پیامک</TableCell>
      <TableCell>
        {r.status === "pending" && <Badge variant="secondary">در انتظار</Badge>}
        {r.status === "approved" && <Badge>تأیید شد</Badge>}
        {r.status === "rejected" && <Badge variant="destructive">رد شد</Badge>}
      </TableCell>
      <TableCell className="text-xs max-w-[180px]">{r.manager_note ?? "-"}</TableCell>
      <TableCell className="text-xs max-w-[180px]">{r.admin_note ?? "-"}</TableCell>
      <TableCell>
        {r.status === "pending" ? (
          <div className="space-y-2 min-w-[180px]">
            {showNote && (
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="یادداشت برای مدیر..."
                rows={2}
                className="text-xs"
              />
            )}
            <div className="flex gap-1">
              <Button size="sm" onClick={() => onReview({ id: r.id, status: "approved", admin_note: note })}>
                <Check className="w-4 h-4 ml-1" /> تأیید
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onReview({ id: r.id, status: "rejected", admin_note: note })}>
                <X className="w-4 h-4 ml-1" /> رد
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNote(!showNote)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">بررسی شده</span>
        )}
      </TableCell>
    </TableRow>
  );
}
