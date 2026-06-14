import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { useSubscriptionPlans, usePlanMutations } from "@/hooks/useSubscription";
import { Textarea } from "@/components/ui/textarea";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

interface Draft {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  features: string[];
  price_per_unit_rial: number;
  is_contact_only: boolean;
}

export function AdminPlans() {
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { update } = usePlanMutations();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    if (!plans) return;
    const next: Record<string, Draft> = {};
    plans
      .filter((p) => p.tier_key)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((p: any) => {
        next[p.id] = {
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          is_active: p.is_active,
          features: Array.isArray(p.features) ? p.features : [],
          price_per_unit_rial: Number(p.price_per_unit_rial ?? 0),
          is_contact_only: Boolean(p.is_contact_only),
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
      price_per_unit_rial: d.is_contact_only ? 0 : Math.round(d.price_per_unit_rial || 0),
      is_contact_only: d.is_contact_only,
    } as any);
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" />;

  return (
    <div className="space-y-4">
      <div className="bg-muted/40 border rounded-lg p-4 text-sm text-muted-foreground">
        قیمت هر واحد (ریال، سالانه) و فهرست فیچرها را برای هر سطح اینجا مدیریت کنید. مدیر هنگام خرید، تعداد واحد دلخواه را وارد می‌کند و مبلغ نهایی = تعداد واحد × نرخ سطح انتخاب‌شده.
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tierPlans.map((p) => {
          const d = drafts[p.id];
          if (!d) return null;
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{d.name}</CardTitle>
                <Switch checked={d.is_active} onCheckedChange={(v) => updateDraft(p.id, { is_active: v })} />
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

                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">نمایش «تماس بگیرید»</Label>
                    <Switch
                      checked={d.is_contact_only}
                      onCheckedChange={(v) => updateDraft(p.id, { is_contact_only: v })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">قیمت هر واحد (ریال / سال)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={d.price_per_unit_rial}
                      disabled={d.is_contact_only}
                      onChange={(e) => updateDraft(p.id, { price_per_unit_rial: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                    />
                    {!d.is_contact_only && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        معادل: {fmt(d.price_per_unit_rial)} ریال
                      </div>
                    )}
                  </div>
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
