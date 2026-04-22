import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2, Save } from "lucide-react";

interface GatewayConfig {
  enabled: boolean;
  merchant_id?: string;
  terminal_id?: string;
  api_key?: string;
  username?: string;
  password?: string;
  callback_url?: string;
  sandbox?: boolean;
}

type BankKey = "saman" | "mellat" | "parsian" | "saderat" | "pasargad" | "melli";

type GatewaysState = {
  zarinpal: GatewayConfig;
  idpay: GatewayConfig;
  nextpay: GatewayConfig;
  banks: Record<BankKey, GatewayConfig>;
};

const DEFAULT_BANK: GatewayConfig = { enabled: false, merchant_id: "", terminal_id: "", callback_url: "", sandbox: false };

const DEFAULT_STATE: GatewaysState = {
  zarinpal: { enabled: false, merchant_id: "", sandbox: true },
  idpay: { enabled: false, api_key: "", sandbox: true },
  nextpay: { enabled: false, api_key: "", sandbox: true },
  banks: {
    saman: { ...DEFAULT_BANK },
    mellat: { ...DEFAULT_BANK },
    parsian: { ...DEFAULT_BANK },
    saderat: { ...DEFAULT_BANK },
    pasargad: { ...DEFAULT_BANK },
    melli: { ...DEFAULT_BANK },
  },
};

const BANK_META: { key: BankKey; name: string; desc: string; fields: ("merchant_id" | "terminal_id" | "username" | "password")[] }[] = [
  { key: "saman", name: "بانک سامان (Saman / SEP)", desc: "درگاه پرداخت الکترونیک سامان", fields: ["merchant_id", "terminal_id"] },
  { key: "mellat", name: "بانک ملت (به‌پرداخت ملت)", desc: "درگاه به‌پرداخت ملت", fields: ["terminal_id", "username", "password"] },
  { key: "parsian", name: "بانک پارسیان", desc: "درگاه پرداخت پارسیان", fields: ["merchant_id"] },
  { key: "saderat", name: "بانک صادرات (سداد)", desc: "درگاه پرداخت سداد", fields: ["merchant_id", "terminal_id"] },
  { key: "pasargad", name: "بانک پاسارگاد", desc: "درگاه پرداخت پاسارگاد", fields: ["merchant_id", "terminal_id"] },
  { key: "melli", name: "بانک ملی (سپ)", desc: "درگاه پرداخت بانک ملی", fields: ["merchant_id", "terminal_id"] },
];

const FIELD_LABELS: Record<string, string> = {
  merchant_id: "Merchant ID / شناسه پذیرنده",
  terminal_id: "Terminal ID / شماره ترمینال",
  username: "نام کاربری",
  password: "رمز عبور",
};

interface Props {
  /** If provided, settings are saved per-customer (override). Otherwise platform-wide. */
  userId?: string;
}

export function PaymentGatewaySettings({ userId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [state, setState] = useState<GatewaysState>(DEFAULT_STATE);

  const queryKey = userId
    ? ["customer_settings", userId, "payment_gateways"]
    : ["platform_settings", "payment_gateways"];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (userId) {
        const { data, error } = await supabase
          .from("customer_settings")
          .select("*")
          .eq("user_id", userId)
          .eq("setting_key", "payment_gateways")
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("*")
          .eq("setting_key", "payment_gateways")
          .maybeSingle();
        if (error) throw error;
        return data;
      }
    },
  });

  useEffect(() => {
    if (data?.setting_value) {
      const incoming = data.setting_value as any;
      setState({
        ...DEFAULT_STATE,
        ...incoming,
        banks: { ...DEFAULT_STATE.banks, ...(incoming.banks || {}) },
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (userId) {
        const { error } = await supabase
          .from("customer_settings")
          .upsert(
            {
              user_id: userId,
              setting_key: "payment_gateways",
              setting_value: state as any,
              is_enabled: true,
            },
            { onConflict: "user_id,setting_key" }
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .upsert(
            {
              setting_key: "payment_gateways",
              setting_value: state as any,
              is_enabled: true,
            },
            { onConflict: "setting_key" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "ذخیره شد", description: "تنظیمات درگاه‌های پرداخت با موفقیت ذخیره شد" });
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
          <CreditCard className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>درگاه‌های پرداخت</CardTitle>
            <CardDescription>
              {userId
                ? "تنظیمات اختصاصی این مشتری (در صورت فعال‌سازی، جایگزین تنظیمات سراسری می‌شود)"
                : "تنظیمات پیش‌فرض درگاه‌های پرداخت برای کل پلتفرم"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ZarinPal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">زرین‌پال (ZarinPal)</h3>
              <p className="text-xs text-muted-foreground">محبوب‌ترین درگاه پرداخت ایرانی</p>
            </div>
            <Switch
              checked={state.zarinpal.enabled}
              onCheckedChange={(v) =>
                setState((s) => ({ ...s, zarinpal: { ...s.zarinpal, enabled: v } }))
              }
            />
          </div>
          {state.zarinpal.enabled && (
            <div className="space-y-3 pr-4 border-r-2 border-primary/20">
              <div className="space-y-2">
                <Label>مرچنت کد (Merchant ID)</Label>
                <Input
                  dir="ltr"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={state.zarinpal.merchant_id || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      zarinpal: { ...s.zarinpal, merchant_id: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={state.zarinpal.sandbox ?? true}
                  onCheckedChange={(v) =>
                    setState((s) => ({ ...s, zarinpal: { ...s.zarinpal, sandbox: v } }))
                  }
                />
                <Label className="cursor-pointer">حالت تست (Sandbox)</Label>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* IDPay */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">آیدی‌پی (IDPay)</h3>
              <p className="text-xs text-muted-foreground">درگاه پرداخت ایرانی با پشتیبانی API ساده</p>
            </div>
            <Switch
              checked={state.idpay.enabled}
              onCheckedChange={(v) =>
                setState((s) => ({ ...s, idpay: { ...s.idpay, enabled: v } }))
              }
            />
          </div>
          {state.idpay.enabled && (
            <div className="space-y-3 pr-4 border-r-2 border-primary/20">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  dir="ltr"
                  type="password"
                  placeholder="api-key"
                  value={state.idpay.api_key || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      idpay: { ...s.idpay, api_key: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={state.idpay.sandbox ?? true}
                  onCheckedChange={(v) =>
                    setState((s) => ({ ...s, idpay: { ...s.idpay, sandbox: v } }))
                  }
                />
                <Label className="cursor-pointer">حالت تست (Sandbox)</Label>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* NextPay */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">نکست‌پی (NextPay)</h3>
              <p className="text-xs text-muted-foreground">درگاه پرداخت با کارمزد پایین</p>
            </div>
            <Switch
              checked={state.nextpay.enabled}
              onCheckedChange={(v) =>
                setState((s) => ({ ...s, nextpay: { ...s.nextpay, enabled: v } }))
              }
            />
          </div>
          {state.nextpay.enabled && (
            <div className="space-y-3 pr-4 border-r-2 border-primary/20">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  dir="ltr"
                  type="password"
                  placeholder="api-key"
                  value={state.nextpay.api_key || ""}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      nextpay: { ...s.nextpay, api_key: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Direct Bank Gateways */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base">درگاه‌های مستقیم بانکی</h3>
            <p className="text-xs text-muted-foreground">
              اگر مستقیماً از یک بانک ایرانی درگاه پرداخت دریافت کرده‌اید، اطلاعات آن را اینجا وارد کنید.
            </p>
          </div>

          {BANK_META.map((bank, idx) => {
            const cfg = state.banks[bank.key];
            return (
              <div key={bank.key} className="space-y-3">
                {idx > 0 && <Separator className="opacity-50" />}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="font-medium">{bank.name}</h4>
                    <p className="text-xs text-muted-foreground">{bank.desc}</p>
                  </div>
                  <Switch
                    checked={cfg.enabled}
                    onCheckedChange={(v) =>
                      setState((s) => ({
                        ...s,
                        banks: { ...s.banks, [bank.key]: { ...s.banks[bank.key], enabled: v } },
                      }))
                    }
                  />
                </div>
                {cfg.enabled && (
                  <div className="space-y-3 pr-4 border-r-2 border-primary/20">
                    {bank.fields.map((field) => (
                      <div key={field} className="space-y-2">
                        <Label>{FIELD_LABELS[field]}</Label>
                        <Input
                          dir="ltr"
                          type={field === "password" ? "password" : "text"}
                          placeholder={FIELD_LABELS[field]}
                          value={(cfg as any)[field] || ""}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              banks: {
                                ...s.banks,
                                [bank.key]: { ...s.banks[bank.key], [field]: e.target.value },
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label>آدرس بازگشت (Callback URL)</Label>
                      <Input
                        dir="ltr"
                        placeholder="https://your-domain.com/payment/callback"
                        value={cfg.callback_url || ""}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            banks: {
                              ...s.banks,
                              [bank.key]: { ...s.banks[bank.key], callback_url: e.target.value },
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cfg.sandbox ?? false}
                        onCheckedChange={(v) =>
                          setState((s) => ({
                            ...s,
                            banks: {
                              ...s.banks,
                              [bank.key]: { ...s.banks[bank.key], sandbox: v },
                            },
                          }))
                        }
                      />
                      <Label className="cursor-pointer">حالت تست (Sandbox)</Label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
