import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Settings as SettingsIcon, FileText, History, Loader2, Save } from "lucide-react";
import {
  useSmsSettings,
  useUpdateSmsSettings,
  useSmsTemplates,
  useUpdateSmsTemplate,
  useSmsLogs,
  type SmsProvider,
  type SmsRecipientMode,
} from "@/hooks/useSms";
import { toJalali } from "@/lib/jalaliDate";

const TEMPLATE_LABELS: Record<string, string> = {
  debt_report: "گزارش بدهی",
  payment_thanks: "تشکر از پرداخت",
  reservation_approved: "تأیید رزرو",
  reservation_rejected: "رد رزرو",
  balance_reminder: "یادآوری مانده بدهی",
};

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  debt_report: ["{نام}", "{واحد}", "{ساختمان}", "{مبلغ}"],
  payment_thanks: ["{نام}", "{واحد}", "{ساختمان}", "{مبلغ}", "{مانده}"],
  reservation_approved: ["{نام}", "{مکان}", "{تاریخ}", "{ساعت}", "{ساختمان}"],
  reservation_rejected: ["{نام}", "{مکان}", "{تاریخ}", "{توضیحات}", "{ساختمان}"],
  balance_reminder: ["{نام}", "{واحد}", "{مانده}", "{ساختمان}"],
};

function formatJalaliDateTime(iso: string) {
  const d = new Date(iso);
  const j = toJalali(d);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")} ${time}`;
}

export function SmsManagementPage() {
  const { data: settings, isLoading } = useSmsSettings();
  const updateSettings = useUpdateSmsSettings();
  const { data: templates = [] } = useSmsTemplates();
  const updateTemplate = useUpdateSmsTemplate();
  const { data: logs = [] } = useSmsLogs(200);

  const [local, setLocal] = useState<typeof settings>(undefined);
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
          <p className="text-muted-foreground text-sm">تنظیمات سرویس، قالب‌ها، گیرندگان و تاریخچه ارسال‌ها</p>
        </div>
      </div>

      <Tabs defaultValue="provider" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="provider"><SettingsIcon className="w-4 h-4 ml-1" /> سرویس و ارسال</TabsTrigger>
          <TabsTrigger value="recipients">گیرندگان و رویدادها</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="w-4 h-4 ml-1" /> قالب‌ها</TabsTrigger>
          <TabsTrigger value="logs"><History className="w-4 h-4 ml-1" /> تاریخچه</TabsTrigger>
        </TabsList>

        {/* PROVIDER */}
        <TabsContent value="provider" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>سرویس پیامک</CardTitle>
              <CardDescription>یک سرویس فعال انتخاب کنید و اطلاعات API آن را وارد کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <Label className="font-medium">فعال‌سازی ارسال پیامک</Label>
                  <p className="text-xs text-muted-foreground mt-1">تا زمانی که این کلید خاموش باشد هیچ پیامکی ارسال نمی‌شود</p>
                </div>
                <Switch checked={s.is_enabled} onCheckedChange={(v) => patch({ is_enabled: v })} />
              </div>

              <div>
                <Label>سرویس فعال</Label>
                <Select value={s.active_provider} onValueChange={(v) => patch({ active_provider: v as SmsProvider })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kavenegar">کاوه‌نگار</SelectItem>
                    <SelectItem value="smsir">SMS.ir</SelectItem>
                    <SelectItem value="melipayamak">ملی‌پیامک</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {s.active_provider === "kavenegar" && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <div>
                    <Label>API Key کاوه‌نگار</Label>
                    <Input value={s.kavenegar_api_key ?? ""} onChange={(e) => patch({ kavenegar_api_key: e.target.value })} placeholder="کلید API" />
                  </div>
                  <div>
                    <Label>شماره فرستنده</Label>
                    <Input value={s.kavenegar_sender ?? ""} onChange={(e) => patch({ kavenegar_sender: e.target.value })} placeholder="مثل 10004346" />
                  </div>
                </div>
              )}

              {s.active_provider === "smsir" && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <div>
                    <Label>API Key اس‌ام‌اس‌دات‌آی‌آر</Label>
                    <Input value={s.smsir_api_key ?? ""} onChange={(e) => patch({ smsir_api_key: e.target.value })} />
                  </div>
                  <div>
                    <Label>خط ارسال (Line Number)</Label>
                    <Input value={s.smsir_sender ?? ""} onChange={(e) => patch({ smsir_sender: e.target.value })} placeholder="مثل 30007732" />
                  </div>
                </div>
              )}

              {s.active_provider === "melipayamak" && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <div>
                    <Label>نام کاربری</Label>
                    <Input value={s.melipayamak_username ?? ""} onChange={(e) => patch({ melipayamak_username: e.target.value })} />
                  </div>
                  <div>
                    <Label>رمز عبور</Label>
                    <Input type="password" value={s.melipayamak_password ?? ""} onChange={(e) => patch({ melipayamak_password: e.target.value })} />
                  </div>
                  <div>
                    <Label>شماره فرستنده</Label>
                    <Input value={s.melipayamak_sender ?? ""} onChange={(e) => patch({ melipayamak_sender: e.target.value })} />
                  </div>
                </div>
              )}

              <Button onClick={() => updateSettings.mutate(s)} disabled={updateSettings.isPending}>
                <Save className="w-4 h-4 ml-1" />
                ذخیره تنظیمات سرویس
              </Button>
            </CardContent>
          </Card>

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
                <Save className="w-4 h-4 ml-1" /> ذخیره
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

        {/* TEMPLATES */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          {templates.map((t) => (
            <TemplateEditor
              key={t.id}
              template={t}
              onSave={(patch) => updateTemplate.mutate({ id: t.id, patch })}
              saving={updateTemplate.isPending}
            />
          ))}
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
                          {log.status === "sent" && <Badge className="bg-emerald-600">ارسال شد</Badge>}
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

function TemplateEditor({
  template,
  onSave,
  saving,
}: {
  template: { id: string; template_key: string; title: string; body: string; is_active: boolean };
  onSave: (patch: { title?: string; body?: string; is_active?: boolean }) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);
  const [active, setActive] = useState(template.is_active);
  const vars = TEMPLATE_VARIABLES[template.template_key] ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{TEMPLATE_LABELS[template.template_key] ?? template.template_key}</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">فعال</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <CardDescription className="text-xs">
          متغیرهای قابل استفاده: {vars.map((v) => <code key={v} className="mx-1 px-1 bg-muted rounded">{v}</code>)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>عنوان</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>متن قالب</Label>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <Button onClick={() => onSave({ title, body, is_active: active })} disabled={saving} size="sm">
          <Save className="w-4 h-4 ml-1" /> ذخیره قالب
        </Button>
      </CardContent>
    </Card>
  );
}
