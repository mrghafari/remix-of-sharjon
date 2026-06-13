import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { useSubscriptionPlans, usePlanMutations, type SubscriptionPlan } from "@/hooks/useSubscription";
import { Textarea } from "@/components/ui/textarea";
import { loadPricingPlans, tariffForTier, tariffPerUnitRial } from "@/lib/tariff";
import type { PricingPlanConfig } from "@/components/admin/AdminPricingSettings";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

interface Draft {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  features: string[];
}

export function AdminPlans() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { update } = usePlanMutations();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pricing, setPricing] = useState<PricingPlanConfig[]>([]);

  useEffect(() => {
    loadPricingPlans().then(setPricing);
  }, []);

  useEffect(() => {
    if (!plans) return;
    const next: Record<string, Draft> = {};
    plans
      .filter((p) => p.tier_key)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((p) => {
        next[p.id] = {
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          is_active: p.is_active,
          features: Array.isArray((p as any).features) ? ((p as any).features as string[]) : [],
        };
      });
    setDrafts(next);
  }, [plans]);

  const tierPlans = (plans ?? []).filter((p) => p.tier_key).sort((a, b) => a.sort_order - b.sort_order);

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const updateFeature = (id: string, idx: number, val: string) =>
    setDrafts((prev) => {
      const f = [...prev[id].features];
      f[idx] = val;
      return { ...prev, [id]: { ...prev[id], features: f } };
    });

  const addFeature = (id: string) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], features: [...prev[id].features, ""] } }));

  const removeFeature = (id: string, idx: number) =>
    setDrafts((prev) => {
      const f = prev[id].features.filter((_, i) => i !== idx);
      return { ...prev, [id]: { ...prev[id], features: f } };
    });

  const handleSave = (id: string) => {
    const d = drafts[id];
    update.mutate({
      id,
      name: d.name,
      description: d.description,
      is_active: d.is_active,
      features: d.features.filter((s) => s.trim().length > 0),
    } as any);
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" />;

  return (
    <div className="space-y-4">
      <div className="bg-muted/40 border rounded-lg p-4 text-sm text-muted-foreground">
        قیمت هر واحد در «تعرفه‌ها» تعریف می‌شود. این بخش فقط نام، توضیحات و فهرست فیچرهای هر سطح را مدیریت می‌کند. مدیر هنگام خرید، تعداد واحد دلخواه را وارد می‌کند و قیمت نهایی = تعداد واحد × نرخ سطح انتخاب‌شده در تعرفه‌هاست.
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tierPlans.map((p) => {
          const d = drafts[p.id];
          if (!d) return null;
          const tariff = tariffForTier(pricing, p.tier_key);
          const perUnit = tariff ? tariffPerUnitRial(tariff) : 0;
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{d.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Switch checked={d.is_active} onCheckedChange={(v) => updateDraft(p.id, { is_active: v })} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>نام نمایشی</Label>
                  <Input value={d.name} onChange={(e) => updateDraft(p.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label>توضیحات</Label>
                  <Textarea
                    rows={2}
                    value={d.description}
                    onChange={(e) => updateDraft(p.id, { description: e.target.value })}
                  />
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="text-muted-foreground text-xs mb-1">نرخ هر واحد (سالانه)</div>
                  {tariff?.contact ? (
                    <div className="font-bold">تماس بگیرید</div>
                  ) : (
                    <div className="font-bold">
                      {fmt(perUnit)} <span className="text-xs font-normal text-muted-foreground">ریال / واحد / سال</span>
                    </div>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-1">قابل ویرایش در «تنظیمات ادمین ← تعرفه‌ها»</div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>فیچرها</Label>
                    <Button size="sm" variant="outline" onClick={() => addFeature(p.id)}>
                      <Plus className="w-3.5 h-3.5 ml-1" /> افزودن
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {d.features.map((f, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input value={f} onChange={(e) => updateFeature(p.id, idx, e.target.value)} placeholder="مثلاً: گزارش‌های پیشرفته" />
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeFeature(p.id, idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {d.features.length === 0 && (
                      <p className="text-xs text-muted-foreground">فیچری اضافه نشده است</p>
                    )}
                  </div>
                </div>

                <Button className="w-full" onClick={() => handleSave(p.id)} disabled={update.isPending}>
                  <Save className="w-4 h-4 ml-1" /> ذخیره
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
