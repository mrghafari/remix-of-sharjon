import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FilePlus, Users } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns-jalali";

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

type FundType = "charge" | "extra_charge";
type AmountMode = "same" | "split";

export function CustomDebtForm() {
  const { currentBuildingId } = useBuilding();
  const { data: units = [] } = useUnits();
  const queryClient = useQueryClient();

  const today = new Date();
  const currentJYear = parseInt(format(today, "yyyy"));
  const currentJMonth = parseInt(format(today, "MM"));

  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [fundType, setFundType] = useState<FundType>("charge");
  const [month, setMonth] = useState(currentJMonth);
  const [year, setYear] = useState(currentJYear);
  const [description, setDescription] = useState("");
  const [amountMode, setAmountMode] = useState<AmountMode>("same");
  const [sharedAmount, setSharedAmount] = useState("");
  const [perUnitAmounts, setPerUnitAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => a.unit_number.localeCompare(b.unit_number, "fa", { numeric: true })),
    [units]
  );

  const allSelected = selectedUnitIds.length === sortedUnits.length && sortedUnits.length > 0;

  const toggleAll = () => {
    setSelectedUnitIds(allSelected ? [] : sortedUnits.map((u) => u.id));
  };

  const toggleUnit = (id: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalPreview = useMemo(() => {
    if (selectedUnitIds.length === 0) return 0;
    if (amountMode === "same") return (Number(sharedAmount) || 0) * selectedUnitIds.length;
    return selectedUnitIds.reduce((sum, id) => sum + (Number(perUnitAmounts[id]) || 0), 0);
  }, [amountMode, sharedAmount, perUnitAmounts, selectedUnitIds]);

  const handleSubmit = async () => {
    if (!currentBuildingId) return;
    if (selectedUnitIds.length === 0) {
      toast({ title: "خطا", description: "حداقل یک واحد انتخاب کنید", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "خطا", description: "توضیحات بدهی الزامی است", variant: "destructive" });
      return;
    }

    const records = selectedUnitIds
      .map((unitId) => {
        const unit = units.find((u) => u.id === unitId);
        if (!unit) return null;
        const amount = amountMode === "same"
          ? Math.round(Number(sharedAmount) || 0)
          : Math.round(Number(perUnitAmounts[unitId]) || 0);
        if (amount <= 0) return null;
        return {
          building_id: currentBuildingId,
          unit_id: unitId,
          amount,
          fund_type: fundType,
          month,
          year,
          description: description.trim(),
          owner_name: unit.owner_name || null,
          resident_name: unit.resident_name || null,
        };
      })
      .filter(Boolean) as any[];

    if (records.length === 0) {
      toast({ title: "خطا", description: "مبلغ معتبری برای ثبت وجود ندارد", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("unit_charges").insert(records);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["unit-charges"] });
      toast({ title: "موفق", description: `بدهی برای ${records.length} واحد ثبت شد` });
      // Reset form
      setSelectedUnitIds([]);
      setSharedAmount("");
      setPerUnitAmounts({});
      setDescription("");
    } catch (e: any) {
      toast({ title: "خطا", description: e?.message || "خطا در ثبت بدهی", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentJYear - 2 + i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FilePlus className="w-5 h-5" />
          ثبت بدهی دستی برای واحدها
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          ثبت بدهی موردی (مثل خسارت، جریمه، هزینه اختصاصی) برای یک یا چند واحد
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Common fields */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>نوع صندوق</Label>
            <Select value={fundType} onValueChange={(v: FundType) => setFundType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="charge">شارژ</SelectItem>
                <SelectItem value="extra_charge">فوق‌شارژ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ماه</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JALALI_MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>سال</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>نحوه مبلغ</Label>
            <Select value={amountMode} onValueChange={(v: AmountMode) => setAmountMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="same">مبلغ یکسان برای همه</SelectItem>
                <SelectItem value="split">مبلغ جداگانه برای هر واحد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>توضیحات بدهی <span className="text-destructive">*</span></Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثال: خسارت شکستن شیشه راهرو"
          />
        </div>

        {amountMode === "same" && (
          <div className="space-y-1.5">
            <Label>مبلغ بدهی هر واحد (تومان)</Label>
            <NumericInput
              value={sharedAmount}
              onChange={(v) => setSharedAmount(v)}
              placeholder="مبلغ"
            />
          </div>
        )}

        {/* Unit selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              انتخاب واحدها ({selectedUnitIds.length} از {sortedUnits.length})
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
              {allSelected ? "حذف انتخاب همه" : "انتخاب همه"}
            </Button>
          </div>
          <ScrollArea className="h-64 border rounded-md p-2">
            <div className="space-y-1">
              {sortedUnits.map((unit) => {
                const checked = selectedUnitIds.includes(unit.id);
                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleUnit(unit.id)}
                      id={`unit-${unit.id}`}
                    />
                    <label
                      htmlFor={`unit-${unit.id}`}
                      className="flex-1 cursor-pointer text-sm flex items-center justify-between gap-2"
                    >
                      <span>
                        واحد <strong>{unit.unit_number}</strong> - {unit.owner_name}
                      </span>
                      {checked && amountMode === "split" && (
                        <div className="w-40" onClick={(e) => e.preventDefault()}>
                          <NumericInput
                            value={perUnitAmounts[unit.id] || ""}
                            onChange={(v) =>
                              setPerUnitAmounts((p) => ({ ...p, [unit.id]: v }))
                            }
                            placeholder="مبلغ"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                );
              })}
              {sortedUnits.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">
                  واحدی ثبت نشده است
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Summary & submit */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">جمع کل بدهی: </span>
            <span className="font-bold text-primary">
              {new Intl.NumberFormat("fa-IR").format(totalPreview)} تومان
            </span>
          </div>
          <Button onClick={handleSubmit} disabled={submitting || selectedUnitIds.length === 0}>
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <FilePlus className="w-4 h-4 ml-2" />
            )}
            ثبت بدهی
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
