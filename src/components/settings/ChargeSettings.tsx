import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Loader2, Zap, CalendarDays, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useBuilding, useUpdateBuilding } from "@/contexts/BuildingContext";
import { useApplyCharges } from "@/hooks/useUnitCharges";
import { useUnits } from "@/hooks/useUnits";
import { useActiveManager } from "@/hooks/useManagers";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function ChargeSettings() {
  const { currentBuilding, currentBuildingId } = useBuilding();
  const updateBuilding = useUpdateBuilding();
  const applyCharges = useApplyCharges();
  const { data: units = [] } = useUnits();
  const { data: activeManager } = useActiveManager();

  const [chargeAmount, setChargeAmount] = useState("0");
  const [extraChargeAmount, setExtraChargeAmount] = useState("0");

  // Sync with building defaults when loaded/changed
  useEffect(() => {
    if (currentBuilding) {
      setChargeAmount(String(currentBuilding.default_charge_amount || 0));
      setExtraChargeAmount(String(currentBuilding.default_extra_charge_amount || 0));
    }
  }, [currentBuilding?.id, currentBuilding?.default_charge_amount, currentBuilding?.default_extra_charge_amount]);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  // Current Jalali month/year
  const now = new Date();
  const currentJalaliYear = format(now, "yyyy", { locale: faIR });
  const currentJalaliMonth = format(now, "M", { locale: faIR });

  const [selectedMonth, setSelectedMonth] = useState(currentJalaliMonth);
  const [selectedYear, setSelectedYear] = useState(currentJalaliYear);
  const [applyDescription, setApplyDescription] = useState("");

  if (!currentBuilding || !currentBuildingId) return null;

  const handleSaveDefaults = () => {
    updateBuilding.mutate({
      id: currentBuildingId,
      default_charge_amount: Number(chargeAmount) || 0,
      default_extra_charge_amount: Number(extraChargeAmount) || 0,
    });
  };

  const handleApply = async () => {
    const monthLabel = `${JALALI_MONTHS[Number(selectedMonth) - 1]} ${selectedYear}`;
    const baseDesc = applyDescription || "";
    const chargeDesc = baseDesc
      ? `شارژ ${monthLabel} - ${baseDesc}`
      : `شارژ ${monthLabel}`;
    const extraDesc = baseDesc
      ? `فوق‌شارژ ${monthLabel} - ${baseDesc}`
      : `فوق‌شارژ ${monthLabel}`;

    // بررسی تکراری بودن شارژ برای این ماه/سال
    if (currentBuildingId) {
      const fundTypesToCheck: ("charge" | "extra_charge")[] = [];
      if ((Number(chargeAmount) || 0) > 0) fundTypesToCheck.push("charge");
      if ((Number(extraChargeAmount) || 0) > 0) fundTypesToCheck.push("extra_charge");

      if (fundTypesToCheck.length > 0) {
        const { data: existing } = await supabase
          .from("unit_charges")
          .select("id, fund_type")
          .eq("building_id", currentBuildingId)
          .eq("month", Number(selectedMonth))
          .eq("year", Number(selectedYear))
          .in("fund_type", fundTypesToCheck);

        if (existing && existing.length > 0) {
          const chargeCount = existing.filter((r) => r.fund_type === "charge").length;
          const extraCount = existing.filter((r) => r.fund_type === "extra_charge").length;
          const parts: string[] = [];
          if (chargeCount > 0) parts.push(`${chargeCount} رکورد شارژ`);
          if (extraCount > 0) parts.push(`${extraCount} رکورد فوق‌شارژ`);
          const ok = window.confirm(
            `برای ${monthLabel} قبلاً ${parts.join(" و ")} ثبت شده است.\nآیا می‌خواهید مجدداً اعمال کنید؟ (ممکن است رکوردهای تکراری ایجاد شود)`
          );
          if (!ok) return;
        }
      }
    }

    applyCharges.mutate(
      {
        chargeAmount: Number(chargeAmount) || 0,
        extraChargeAmount: Number(extraChargeAmount) || 0,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        chargeDescription: chargeDesc,
        extraChargeDescription: extraDesc,
      },
      { onSuccess: () => setApplyDialogOpen(false) }
    );
  };

  const vacantCount = units.filter((u) => !u.is_occupied).length;
  const hasManagerDiscount =
    activeManager?.unit_id &&
    ((activeManager.charge_discount_percent || 0) > 0 ||
      (activeManager.extra_charge_discount_percent || 0) > 0);

  // Generate year options
  const baseYear = Number(currentJalaliYear);
  const yearOptions = [baseYear - 1, baseYear, baseYear + 1];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            تنظیمات شارژ و فوق‌شارژ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>مبلغ پیش‌فرض شارژ (تومان)</Label>
              <NumericInput
                value={chargeAmount}
                onChange={setChargeAmount}
                placeholder="مثال: 500,000"
              />
            </div>
            <div className="space-y-2">
              <Label>مبلغ پیش‌فرض فوق‌شارژ (تومان)</Label>
              <NumericInput
                value={extraChargeAmount}
                onChange={setExtraChargeAmount}
                placeholder="مثال: 200,000"
              />
            </div>
          </div>

          {/* Info about discounts */}
          {(vacantCount > 0 || hasManagerDiscount) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {vacantCount > 0 && (
                  <div>
                    {vacantCount} واحد خالی — معافیت شارژ{" "}
                    {currentBuilding.vacant_charge_discount_percent}% | فوق‌شارژ{" "}
                    {currentBuilding.vacant_extra_charge_discount_percent}%
                  </div>
                )}
                {hasManagerDiscount && (
                  <div>
                    تخفیف مدیر — شارژ {activeManager!.charge_discount_percent}% |
                    فوق‌شارژ {activeManager!.extra_charge_discount_percent}%
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleSaveDefaults}
              variant="outline"
              disabled={updateBuilding.isPending}
            >
              {updateBuilding.isPending && (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              )}
              ذخیره مقادیر پیش‌فرض
            </Button>
            <Button
              onClick={() => setApplyDialogOpen(true)}
              disabled={
                (Number(chargeAmount) || 0) === 0 &&
                (Number(extraChargeAmount) || 0) === 0
              }
            >
              <CalendarDays className="w-4 h-4 ml-2" />
              اعمال برای واحدها
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>اعمال شارژ برای واحدها</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ماه</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JALALI_MONTHS.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>سال</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>توضیحات (اختیاری)</Label>
              <Input
                value={applyDescription}
                onChange={(e) => setApplyDescription(e.target.value)}
                placeholder={`شارژ ${JALALI_MONTHS[Number(selectedMonth) - 1]} ${selectedYear}`}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="font-medium">خلاصه:</div>
              {Number(chargeAmount) > 0 && (
                <div>
                  شارژ: {Number(chargeAmount).toLocaleString("fa-IR")} تومان ×{" "}
                  {units.length} واحد
                </div>
              )}
              {Number(extraChargeAmount) > 0 && (
                <div>
                  فوق‌شارژ: {Number(extraChargeAmount).toLocaleString("fa-IR")}{" "}
                  تومان × {units.length} واحد
                </div>
              )}
              <div className="text-muted-foreground text-xs mt-1">
                تخفیفات مدیر و واحدهای خالی به صورت خودکار اعمال می‌شود.
              </div>
            </div>

            <Button
              onClick={handleApply}
              className="w-full"
              disabled={applyCharges.isPending}
            >
              {applyCharges.isPending && (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              )}
              اعمال شارژ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
