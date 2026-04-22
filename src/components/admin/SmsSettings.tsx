import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Loader2, Save, Plus, Trash2 } from "lucide-react";

interface SmsConfig {
  enabled: boolean;
  api_key?: string;
  sender?: string;
}

interface SmsTemplate {
  id: string;
  title: string;
  content: string;
}

type SmsState = {
  active_provider: "smsir" | "kavenegar" | "melipayamak" | "faraz" | "";
  smsir: SmsConfig & { line_number?: string };
  kavenegar: SmsConfig;
  melipayamak: SmsConfig & { username?: string; password?: string };
  faraz: SmsConfig & { username?: string; password?: string };
  templates: SmsTemplate[];
};

const DEFAULT_TEMPLATES: SmsTemplate[] = [
  { id: crypto.randomUUID(), title: "پیام خوش‌آمدگویی / کد ورود", content: "به سامانه شارژان خوش آمدید. کد ورود: {code}" },
  { id: crypto.randomUUID(), title: "تأیید پرداخت", content: "پرداخت شما به مبلغ {amount} تومان با موفقیت ثبت شد." },
  { id: crypto.randomUUID(), title: "یادآوری شارژ", content: "شارژ ماهانه شما به مبلغ {amount} تومان در انتظار پرداخت است." },
];

const DEFAULT_STATE: SmsState = {
  active_provider: "",
  smsir: { enabled: false, api_key: "", line_number: "" },
  kavenegar: { enabled: false, api_key: "", sender: "" },
  melipayamak: { enabled: false, username: "", password: "", sender: "" },
  faraz: { enabled: false, username: "", password: "", sender: "" },
  templates: DEFAULT_TEMPLATES,
};

interface Props {
  userId?: string;
}

export function SmsSettings({ userId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [state, setState] = useState<SmsState>(DEFAULT_STATE);

  const queryKey = userId
    ? ["customer_settings", userId, "sms"]
    : ["platform_settings", "sms"];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (userId) {
        const { data, error } = await supabase
          .from("customer_settings")
          .select("*")
          .eq("user_id", userId)
          .eq("setting_key", "sms")
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("*")
          .eq("setting_key", "sms")
          .maybeSingle();
        if (error) throw error;
        return data;
      }
    },
  });

  useEffect(() => {
    if (data?.setting_value) {
      const v = data.setting_value as any;
      let templates: SmsTemplate[] = DEFAULT_TEMPLATES;
      if (Array.isArray(v.templates)) {
        templates = v.templates;
      } else if (v.templates && typeof v.templates === "object") {
        // Migrate legacy keyed object
        const legacyTitles: Record<string, string> = {
          welcome: "پیام خوش‌آمدگویی / کد ورود",
          payment_confirm: "تأیید پرداخت",
          charge_reminder: "یادآوری شارژ",
        };
        templates = Object.entries(v.templates).map(([key, content]) => ({
          id: crypto.randomUUID(),
          title: legacyTitles[key] || key,
          content: String(content || ""),
        }));
      }
      setState({ ...DEFAULT_STATE, ...v, templates });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        setting_key: "sms",
        setting_value: state as any,
        is_enabled: true,
      };
      if (userId) {
        const { error } = await supabase
          .from("customer_settings")
          .upsert({ ...payload, user_id: userId }, { onConflict: "user_id,setting_key" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .upsert(payload, { onConflict: "setting_key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "ذخیره شد", description: "تنظیمات سرویس پیامک با موفقیت ذخیره شد" });
    },
    onError: (e: any) => {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>سرویس پیامک</CardTitle>
            <CardDescription>
              {userId
                ? "تنظیمات اختصاصی پیامک این مشتری"
                : "تنظیمات پیش‌فرض سرویس پیامک پلتفرم"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SMS.ir */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">SMS.ir</h3>
            </div>
            <Switch
              checked={state.smsir.enabled}
              onCheckedChange={(v) =>
                setState((s) => ({
                  ...s,
                  smsir: { ...s.smsir, enabled: v },
                  active_provider: v ? "smsir" : s.active_provider,
                }))
              }
            />
          </div>
          {state.smsir.enabled && (
            <div className="space-y-3 pr-4 border-r-2 border-primary/20">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  dir="ltr"
                  type="password"
                  value={state.smsir.api_key || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      smsir: { ...s.smsir, api_key: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>شماره خط (Line Number)</Label>
                <Input
                  dir="ltr"
                  placeholder="30007732"
                  value={state.smsir.line_number || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      smsir: { ...s.smsir, line_number: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Kavenegar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">کاوه‌نگار (Kavenegar)</h3>
              <p className="text-xs text-muted-foreground">محبوب‌ترین سرویس پیامک ایرانی</p>
            </div>
            <Switch
              checked={state.kavenegar.enabled}
              onCheckedChange={(v) =>
                setState((s) => ({
                  ...s,
                  kavenegar: { ...s.kavenegar, enabled: v },
                  active_provider: v ? "kavenegar" : s.active_provider,
                }))
              }
            />
          </div>
          {state.kavenegar.enabled && (
            <div className="space-y-3 pr-4 border-r-2 border-primary/20">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  dir="ltr"
                  type="password"
                  value={state.kavenegar.api_key || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      kavenegar: { ...s.kavenegar, api_key: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>شماره فرستنده</Label>
                <Input
                  dir="ltr"
                  placeholder="10004346"
                  value={state.kavenegar.sender || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      kavenegar: { ...s.kavenegar, sender: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Melipayamak */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">ملی‌پیامک (Melipayamak)</h3>
              <p className="text-xs text-muted-foreground">سرویس پیامک با پنل کامل</p>
            </div>
            <Switch
              checked={state.melipayamak.enabled}
              onCheckedChange={(v) =>
                setState((s) => ({
                  ...s,
                  melipayamak: { ...s.melipayamak, enabled: v },
                  active_provider: v ? "melipayamak" : s.active_provider,
                }))
              }
            />
          </div>
          {state.melipayamak.enabled && (
            <div className="space-y-3 pr-4 border-r-2 border-primary/20">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>نام کاربری</Label>
                  <Input
                    dir="ltr"
                    value={state.melipayamak.username || ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        melipayamak: { ...s.melipayamak, username: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمز عبور</Label>
                  <Input
                    dir="ltr"
                    type="password"
                    value={state.melipayamak.password || ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        melipayamak: { ...s.melipayamak, password: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>شماره فرستنده</Label>
                <Input
                  dir="ltr"
                  value={state.melipayamak.sender || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      melipayamak: { ...s.melipayamak, sender: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Faraz */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">فراز اس‌ام‌اس (Faraz SMS)</h3>
              <p className="text-xs text-muted-foreground">سرویس پیامک با تعرفه مناسب</p>
            </div>
            <Switch
              checked={state.faraz.enabled}
              onCheckedChange={(v) =>
                setState((s) => ({
                  ...s,
                  faraz: { ...s.faraz, enabled: v },
                  active_provider: v ? "faraz" : s.active_provider,
                }))
              }
            />
          </div>
          {state.faraz.enabled && (
            <div className="space-y-3 pr-4 border-r-2 border-primary/20">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>نام کاربری</Label>
                  <Input
                    dir="ltr"
                    value={state.faraz.username || ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        faraz: { ...s.faraz, username: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمز عبور</Label>
                  <Input
                    dir="ltr"
                    type="password"
                    value={state.faraz.password || ""}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        faraz: { ...s.faraz, password: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>شماره فرستنده</Label>
                <Input
                  dir="ltr"
                  value={state.faraz.sender || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      faraz: { ...s.faraz, sender: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Templates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">قالب پیام‌ها</h3>
              <p className="text-xs text-muted-foreground">
                از متغیرهای {"{code}"}, {"{amount}"}, {"{name}"} می‌توانید استفاده کنید.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  templates: [
                    ...s.templates,
                    { id: crypto.randomUUID(), title: `قالب جدید ${s.templates.length + 1}`, content: "" },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              قالب جدید
            </Button>
          </div>

          <div className="space-y-3">
            {state.templates.map((tpl, idx) => (
              <div key={tpl.id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-2">
                    {idx + 1}
                  </span>
                  <Input
                    placeholder="عنوان قالب"
                    value={tpl.title}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        templates: s.templates.map((t) =>
                          t.id === tpl.id ? { ...t, title: e.target.value } : t
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive shrink-0"
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        templates: s.templates.filter((t) => t.id !== tpl.id),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={2}
                  placeholder="متن پیامک..."
                  value={tpl.content}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      templates: s.templates.map((t) =>
                        t.id === tpl.id ? { ...t, content: e.target.value } : t
                      ),
                    }))
                  }
                />
              </div>
            ))}
            {state.templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                هنوز قالبی تعریف نشده است. روی «قالب جدید» کلیک کنید.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            ذخیره تنظیمات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
