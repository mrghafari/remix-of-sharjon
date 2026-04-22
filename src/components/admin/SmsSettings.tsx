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
import { MessageSquare, Loader2, Save } from "lucide-react";

interface SmsConfig {
  enabled: boolean;
  api_key?: string;
  sender?: string;
}

type SmsState = {
  active_provider: "smsir" | "kavenegar" | "melipayamak" | "faraz" | "";
  smsir: SmsConfig & { line_number?: string };
  kavenegar: SmsConfig;
  melipayamak: SmsConfig & { username?: string; password?: string };
  faraz: SmsConfig & { username?: string; password?: string };
  templates: {
    welcome: string;
    payment_confirm: string;
    charge_reminder: string;
  };
};

const DEFAULT_STATE: SmsState = {
  active_provider: "",
  smsir: { enabled: false, api_key: "", line_number: "" },
  kavenegar: { enabled: false, api_key: "", sender: "" },
  melipayamak: { enabled: false, username: "", password: "", sender: "" },
  faraz: { enabled: false, username: "", password: "", sender: "" },
  templates: {
    welcome: "به سامانه شارژان خوش آمدید. کد ورود: {code}",
    payment_confirm: "پرداخت شما به مبلغ {amount} تومان با موفقیت ثبت شد.",
    charge_reminder: "شارژ ماهانه شما به مبلغ {amount} تومان در انتظار پرداخت است.",
  },
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
      setState({
        ...DEFAULT_STATE,
        ...v,
        templates: { ...DEFAULT_STATE.templates, ...(v.templates || {}) },
      });
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
          <h3 className="font-semibold">قالب پیام‌ها</h3>
          <p className="text-xs text-muted-foreground">
            از متغیرهای {"{code}"}, {"{amount}"}, {"{name}"} می‌توانید استفاده کنید.
          </p>
          <div className="space-y-2">
            <Label>پیام خوش‌آمدگویی / کد ورود</Label>
            <Textarea
              rows={2}
              value={state.templates.welcome}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  templates: { ...s.templates, welcome: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>تأیید پرداخت</Label>
            <Textarea
              rows={2}
              value={state.templates.payment_confirm}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  templates: { ...s.templates, payment_confirm: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>یادآوری شارژ</Label>
            <Textarea
              rows={2}
              value={state.templates.charge_reminder}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  templates: { ...s.templates, charge_reminder: e.target.value },
                }))
              }
            />
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
