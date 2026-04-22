import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, BadgePercent, AlertTriangle, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PaymentPolicy {
  id?: string;
  building_id: string;
  early_pay_enabled: boolean;
  early_pay_days: number;
  early_pay_discount_percent: number;
  late_penalty_enabled: boolean;
  late_grace_days: number;
  late_penalty_percent_per_month: number;
  late_penalty_max_months: number;
}

const DEFAULTS = {
  early_pay_enabled: false,
  early_pay_days: 7,
  early_pay_discount_percent: 0,
  late_penalty_enabled: false,
  late_grace_days: 30,
  late_penalty_percent_per_month: 0,
  late_penalty_max_months: 12,
};

export function PaymentPolicySettings() {
  const { currentBuildingId } = useBuilding();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["building_payment_policies", currentBuildingId],
    enabled: !!currentBuildingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_payment_policies")
        .select("*")
        .eq("building_id", currentBuildingId!)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentPolicy | null;
    },
  });

  const [form, setForm] = useState<PaymentPolicy | null>(null);

  useEffect(() => {
    if (!currentBuildingId) return;
    setForm({
      building_id: currentBuildingId,
      ...DEFAULTS,
      ...(data || {}),
    });
  }, [data, currentBuildingId]);

  const save = useMutation({
    mutationFn: async (payload: PaymentPolicy) => {
      const { error } = await supabase
        .from("building_payment_policies")
        .upsert(payload, { onConflict: "building_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["building_payment_policies", currentBuildingId] });
      toast({ title: "تنظیمات ذخیره شد" });
    },
    onError: (e: any) => {
      toast({ title: "خطا در ذخیره", description: e.message, variant: "destructive" });
    },
  });

  if (!currentBuildingId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          ابتدا یک ساختمان انتخاب کنید.
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !form) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const update = <K extends keyof PaymentPolicy>(k: K, v: PaymentPolicy[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgePercent className="w-5 h-5" />
          خوش‌حسابی و جریمه تأخیر
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          مبنای محاسبه، مانده حساب واحد در گردش مالی است.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Early payment discount */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <BadgePercent className="w-4 h-4 text-primary" />
              تخفیف خوش‌حسابی
            </div>
            <Switch
              checked={form.early_pay_enabled}
              onCheckedChange={(v) => update("early_pay_enabled", v)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            اگر واحدی پرداخت خود را تا روز مشخص‌شده از ماه شمسی انجام دهد، درصدی به‌عنوان تخفیف از مبلغ پرداخت کسر و به‌عنوان بستانکاری ثبت می‌شود.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>روز ملاک در ماه (تا روز چندم ماه)</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.early_pay_days}
                onChange={(e) => update("early_pay_days", Number(e.target.value) || 0)}
                disabled={!form.early_pay_enabled}
              />
              <p className="text-[11px] text-muted-foreground">
                مثال: اگر ۷ باشد، پرداخت‌های روز ۱ تا ۷ هر ماه شمسی مشمول تخفیف می‌شوند.
              </p>
            </div>
            <div className="space-y-2">
              <Label>درصد تخفیف</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.early_pay_discount_percent}
                onChange={(e) =>
                  update("early_pay_discount_percent", Number(e.target.value) || 0)
                }
                disabled={!form.early_pay_enabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Late penalty */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              جریمه تأخیر
            </div>
            <Switch
              checked={form.late_penalty_enabled}
              onCheckedChange={(v) => update("late_penalty_enabled", v)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            اگر بدهی واحد بیش از «مهلت روزها» باقی بماند، به ازای هر ماه تأخیر، درصد مشخصی از مانده بدهی به‌عنوان جریمه به بدهی او اضافه می‌شود.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>مهلت بدون جریمه (روز)</Label>
              <Input
                type="number"
                min={0}
                value={form.late_grace_days}
                onChange={(e) => update("late_grace_days", Number(e.target.value) || 0)}
                disabled={!form.late_penalty_enabled}
              />
            </div>
            <div className="space-y-2">
              <Label>درصد جریمه ماهانه</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.late_penalty_percent_per_month}
                onChange={(e) =>
                  update("late_penalty_percent_per_month", Number(e.target.value) || 0)
                }
                disabled={!form.late_penalty_enabled}
              />
            </div>
            <div className="space-y-2">
              <Label>سقف ماه‌های مشمول</Label>
              <Input
                type="number"
                min={1}
                value={form.late_penalty_max_months}
                onChange={(e) =>
                  update("late_penalty_max_months", Number(e.target.value) || 0)
                }
                disabled={!form.late_penalty_enabled}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={() => save.mutate(form)}
          disabled={save.isPending}
          className="gap-2"
        >
          {save.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          ذخیره تنظیمات
        </Button>
      </CardContent>
    </Card>
  );
}
