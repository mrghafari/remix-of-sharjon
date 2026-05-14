import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export interface PricingPlanConfig {
  name: string;
  description: string;
  price: string; // numeric as string (in thousand Toman)
  contact: boolean; // when true, show "تماس بگیرید"
  features: string[];
  highlighted: boolean;
}

export const DEFAULT_PRICING: PricingPlanConfig[] = [
  {
    name: "رایگان",
    description: "مناسب برای یک ساختمان کوچک",
    price: "۰",
    contact: false,
    features: ["۱ ساختمان", "حداکثر ۱۰ واحد", "گزارش‌های پایه", "پشتیبانی ایمیلی"],
    highlighted: false,
  },
  {
    name: "حرفه‌ای",
    description: "برای مدیران حرفه‌ای ساختمان",
    price: "۱۴۹",
    contact: false,
    features: ["تا ۵ ساختمان", "واحدهای نامحدود", "گزارش‌های پیشرفته", "اطلاع‌رسانی خودکار", "پشتیبانی اولویت‌دار"],
    highlighted: true,
  },
  {
    name: "سازمانی",
    description: "برای شرکت‌های مدیریت ساختمان",
    price: "",
    contact: true,
    features: ["ساختمان‌های نامحدود", "API اختصاصی", "داشبورد مدیریتی", "SLA اختصاصی", "پشتیبانی ۲۴/۷"],
    highlighted: false,
  },
];

export function AdminPricingSettings() {
  const [plans, setPlans] = useState<PricingPlanConfig[]>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "pricing_plans")
        .maybeSingle();
      if (data?.setting_value && Array.isArray((data.setting_value as any).plans)) {
        setPlans((data.setting_value as any).plans);
      }
      setLoading(false);
    })();
  }, []);

  const updatePlan = (idx: number, patch: Partial<PricingPlanConfig>) => {
    setPlans((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        {
          setting_key: "pricing_plans",
          setting_value: { plans } as any,
          is_enabled: true,
        },
        { onConflict: "setting_key" }
      );
    setSaving(false);
    if (error) {
      toast.error("خطا در ذخیره‌سازی: " + error.message);
    } else {
      toast.success("تعرفه‌ها با موفقیت ذخیره شد");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 border rounded-lg p-4 text-sm text-muted-foreground">
        قیمت پلن‌ها (به <strong className="text-foreground">هزار تومان در ماه</strong>) را اینجا تنظیم کنید. اگر می‌خواهید به‌جای قیمت عبارت «تماس بگیرید» نمایش داده شود، گزینه «تماس بگیرید» را فعال کنید.
      </div>

      {plans.map((plan, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="text-base">{plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>قیمت (هزار تومان / ماه)</Label>
                <Input
                  value={plan.price}
                  onChange={(e) => updatePlan(idx, { price: e.target.value })}
                  disabled={plan.contact}
                  placeholder="مثلاً ۱۴۹"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="cursor-pointer">نمایش «تماس بگیرید» به‌جای قیمت</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    در صورت فعال‌سازی، عدد قیمت نادیده گرفته می‌شود.
                  </p>
                </div>
                <Switch
                  checked={plan.contact}
                  onCheckedChange={(v) => updatePlan(idx, { contact: v })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
          ذخیره تعرفه‌ها
        </Button>
      </div>
    </div>
  );
}
