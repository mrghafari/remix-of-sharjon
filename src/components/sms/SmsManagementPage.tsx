import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Clock, Users, History, Loader2, Save, ShoppingCart, Send } from "lucide-react";
import {
  useSmsSettings,
  useUpdateSmsSettings,
  useSmsLogs,
  type SmsRecipientMode,
} from "@/hooks/useSms";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const SMS_PACKAGES = [
  { count: 1000, price: 150000 },
  { count: 5000, price: 700000 },
  { count: 10000, price: 1300000 },
  { count: 25000, price: 3000000 },
  { count: 50000, price: 5500000 },
];

function formatToman(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n) + " تومان";
}

const TEMPLATE_LABELS: Record<string, string> = {
  debt_report: "گزارش بدهی",
  payment_thanks: "تشکر از پرداخت",
  reservation_approved: "تأیید رزرو",
  reservation_rejected: "رد رزرو",
  balance_reminder: "یادآوری مانده بدهی",
};

function formatJalaliDateTime(iso: string) {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${formatJalaliDate(iso)} ${time}`;
}

export function SmsManagementPage() {
  const { data: settings, isLoading } = useSmsSettings();
  const updateSettings = useUpdateSmsSettings();
  const { data: logs = [] } = useSmsLogs(200);
  const { currentBuildingId } = useBuilding();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [local, setLocal] = useState<typeof settings>(undefined);
  const [selectedPackage, setSelectedPackage] = useState<number>(SMS_PACKAGES[1].count);
  const [managerNote, setManagerNote] = useState("");

  const { data: requests = [] } = useQuery({
    queryKey: ["sms_credit_requests", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await (supabase as any)
        .from("sms_credit_requests")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentBuildingId,
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!currentBuildingId || !user) throw new Error("ساختمان یا کاربر نامشخص");
      const { error } = await (supabase as any).from("sms_credit_requests").insert({
        building_id: currentBuildingId,
        requested_by: user.id,
        package_count: selectedPackage,
        manager_note: managerNote || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_credit_requests", currentBuildingId] });
      setManagerNote("");
      toast({ title: "درخواست ثبت شد", description: "ادمین به‌زودی بررسی خواهد کرد" });
    },
    onError: (e: Error) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });

  const s = local ?? settings ?? null;

  if (isLoading || !s) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const patch = (p: Partial<NonNullable<typeof settings>>) => setLocal({ ...(s as any), ...p });

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">مدیریت پیامک</h1>
          <p className="text-muted-foreground text-sm">زمان‌بندی خودکار، گیرندگان رویدادها، تاریخچه و خرید بسته پیامک</p>
        </div>
      </div>

      <Tabs defaultValue="schedule" dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule"><Clock className="w-4 h-4 ml-1" /> زمان‌بندی خودکار</TabsTrigger>
          <TabsTrigger value="recipients"><Users className="w-4 h-4 ml-1" /> گیرندگان و رویدادها</TabsTrigger>
          <TabsTrigger value="credits"><ShoppingCart className="w-4 h-4 ml-1" /> خرید اعتبار</TabsTrigger>
          <TabsTrigger value="logs"><History className="w-4 h-4 ml-1" /> تاریخچه</TabsTrigger>
        </TabsList>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>زمان‌بندی خودکار گزارش بدهی</CardTitle>
              <CardDescription>گزارش بدهی به صورت ماهانه در روز و ساعت تعیین‌شده ارسال می‌شود</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>فعال‌سازی ارسال خودکار ماهانه</Label>
                <Switch checked={s.debt_auto_schedule_enabled} onCheckedChange={(v) => patch({ debt_auto_schedule_enabled: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>روز ماه شمسی (۱ تا ۳۰)</Label>
                  <Input type="number" min={1} max={30} value={s.debt_auto_schedule_day} onChange={(e) => patch({ debt_auto_schedule_day: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>ساعت (۰ تا ۲۳)</Label>
                  <Input type="number" min={0} max={23} value={s.debt_auto_schedule_hour} onChange={(e) => patch({ debt_auto_schedule_hour: Number(e.target.value) })} />
                </div>
              </div>
              <Button onClick={() => updateSettings.mutate(s)} disabled={updateSettings.isPending}>
                <Save className="w-4 h-4 ml-1" /> ذخیره زمان‌بندی
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECIPIENTS */}
        <TabsContent value="recipients" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>گیرنده پیش‌فرض هر نوع پیامک</CardTitle>
              <CardDescription>یکبار تنظیم کنید — سیستم به صورت خودکار از این تنظیمات پیروی می‌کند</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "debt_report" as const, label: "گزارش بدهی", recipientField: "debt_report_recipient" as const, enabledField: "debt_report_enabled" as const },
                { key: "payment_thanks" as const, label: "تشکر از پرداخت + یادآوری مانده", recipientField: "payment_thanks_recipient" as const, enabledField: "payment_thanks_enabled" as const },
                { key: "reservation" as const, label: "اطلاع‌رسانی رزرو (تأیید/رد)", recipientField: "reservation_recipient" as const, enabledField: "reservation_enabled" as const },
                { key: "balance_reminder" as const, label: "یادآوری مانده بدهی (دستی)", recipientField: "balance_reminder_recipient" as const, enabledField: "balance_reminder_enabled" as const },
              ].map((row) => (
                <div key={row.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-lg p-3 items-center">
                  <div className="flex items-center justify-between md:justify-start gap-3">
                    <span className="font-medium">{row.label}</span>
                    <Switch
                      checked={s[row.enabledField] as boolean}
                      onCheckedChange={(v) => patch({ [row.enabledField]: v } as any)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      value={s[row.recipientField] as SmsRecipientMode}
                      onValueChange={(v) => patch({ [row.recipientField]: v } as any)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">فقط مالک</SelectItem>
                        <SelectItem value="resident">فقط ساکن</SelectItem>
                        <SelectItem value="both">مالک و ساکن</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              <Button onClick={() => updateSettings.mutate(s)} disabled={updateSettings.isPending}>
                <Save className="w-4 h-4 ml-1" /> ذخیره گیرندگان
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREDITS PURCHASE */}
        <TabsContent value="credits" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>درخواست خرید بسته پیامک</CardTitle>
              <CardDescription>بسته مورد نظر را انتخاب و درخواست خود را ثبت کنید. ادمین پس از بررسی، اعتبار را شارژ می‌کند.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">انتخاب بسته</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SMS_PACKAGES.map((pkg) => (
                    <button
                      key={pkg.count}
                      type="button"
                      onClick={() => setSelectedPackage(pkg.count)}
                      className={`border rounded-lg p-4 text-right transition-all ${
                        selectedPackage === pkg.count
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-bold text-lg">{new Intl.NumberFormat("fa-IR").format(pkg.count)} پیامک</div>
                      <div className="text-sm text-muted-foreground mt-1">{formatToman(pkg.price)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="manager-note">توضیحات (اختیاری)</Label>
                <Textarea
                  id="manager-note"
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  placeholder="در صورت نیاز توضیحی برای ادمین بنویسید..."
                  rows={3}
                />
              </div>

              <Button onClick={() => submitRequest.mutate()} disabled={submitRequest.isPending}>
                <Send className="w-4 h-4 ml-1" />
                {submitRequest.isPending ? "در حال ارسال..." : "ثبت درخواست خرید"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تاریخچه درخواست‌ها</CardTitle>
              <CardDescription>{requests.length} درخواست</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>تاریخ</TableHead>
                      <TableHead>تعداد بسته</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>توضیحات شما</TableHead>
                      <TableHead>پاسخ ادمین</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">درخواستی ثبت نشده است</TableCell></TableRow>
                    )}
                    {requests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs">{formatJalaliDateTime(r.created_at)}</TableCell>
                        <TableCell>{new Intl.NumberFormat("fa-IR").format(r.package_count)} پیامک</TableCell>
                        <TableCell>
                          {r.status === "pending" && <Badge variant="secondary">در انتظار بررسی</Badge>}
                          {r.status === "approved" && <Badge>تأیید و شارژ شد</Badge>}
                          {r.status === "rejected" && <Badge variant="destructive">رد شد</Badge>}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={r.manager_note ?? ""}>{r.manager_note ?? "-"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={r.admin_note ?? ""}>{r.admin_note ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>تاریخچه ارسال‌ها</CardTitle>
              <CardDescription>{logs.length} رکورد اخیر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>تاریخ</TableHead>
                      <TableHead>نوع</TableHead>
                      <TableHead>گیرنده</TableHead>
                      <TableHead>شماره</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>متن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">ارسالی ثبت نشده است</TableCell></TableRow>
                    )}
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">{formatJalaliDateTime(log.sent_at)}</TableCell>
                        <TableCell>{TEMPLATE_LABELS[log.template_key] ?? log.template_key}</TableCell>
                        <TableCell>{log.recipient_name ?? "-"}{log.recipient_role && ` (${log.recipient_role === "owner" ? "مالک" : "ساکن"})`}</TableCell>
                        <TableCell className="font-mono text-xs">{log.recipient_phone}</TableCell>
                        <TableCell>
                          {log.status === "sent" && <Badge>ارسال شد</Badge>}
                          {log.status === "failed" && <Badge variant="destructive" title={log.error_message ?? ""}>خطا</Badge>}
                          {log.status === "pending" && <Badge variant="secondary">در صف</Badge>}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-xs" title={log.message_body}>{log.message_body}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
