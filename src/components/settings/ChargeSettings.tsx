import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Loader2, Zap, CalendarDays, Info, AlertTriangle, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoDay, setAutoDay] = useState("1");
  const [chargeAllocType, setChargeAllocType] = useState<string>("equal");
  const [extraAllocType, setExtraAllocType] = useState<string>("equal");
  const [chargeAreaRatio, setChargeAreaRatio] = useState("50");
  const [extraAreaRatio, setExtraAreaRatio] = useState("50");

  // Sync with building defaults when loaded/changed
  useEffect(() => {
    if (currentBuilding) {
      setChargeAmount(String(currentBuilding.default_charge_amount || 0));
      setExtraChargeAmount(String(currentBuilding.default_extra_charge_amount || 0));
      setAutoEnabled(Boolean(currentBuilding.auto_charge_enabled));
      setAutoDay(String(currentBuilding.auto_charge_day || 1));
      setChargeAllocType(currentBuilding.charge_allocation_type || "equal");
      setExtraAllocType(currentBuilding.extra_charge_allocation_type || "equal");
      setChargeAreaRatio(String(currentBuilding.charge_area_ratio ?? 50));
      setExtraAreaRatio(String(currentBuilding.extra_charge_area_ratio ?? 50));
    }
  }, [currentBuilding?.id, currentBuilding?.default_charge_amount, currentBuilding?.default_extra_charge_amount, currentBuilding?.auto_charge_enabled, currentBuilding?.auto_charge_day, currentBuilding?.charge_allocation_type, currentBuilding?.extra_charge_allocation_type, currentBuilding?.charge_area_ratio, currentBuilding?.extra_charge_area_ratio]);
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
    const dayNum = Math.max(1, Math.min(31, Number(autoDay) || 1));
    updateBuilding.mutate({
      id: currentBuildingId,
      default_charge_amount: Number(chargeAmount) || 0,
      default_extra_charge_amount: Number(extraChargeAmount) || 0,
      auto_charge_enabled: autoEnabled,
      auto_charge_day: dayNum,
      charge_allocation_type: chargeAllocType,
      extra_charge_allocation_type: extraAllocType,
      charge_area_ratio: Math.max(0, Math.min(100, Number(chargeAreaRatio) || 50)),
      extra_charge_area_ratio: Math.max(0, Math.min(100, Number(extraAreaRatio) || 50)),
    });
  };

  const buildDescriptions = () => {
    const monthLabel = `${JALALI_MONTHS[Number(selectedMonth) - 1]} ${selectedYear}`;
    const baseDesc = applyDescription || "";
    return {
      monthLabel,
      chargeDesc: baseDesc ? `شارژ ${monthLabel} - ${baseDesc}` : `شارژ ${monthLabel}`,
      extraDesc: baseDesc ? `فوق‌شارژ ${monthLabel} - ${baseDesc}` : `فوق‌شارژ ${monthLabel}`,
    };
  };

  const runApply = () => {
    const { chargeDesc, extraDesc } = buildDescriptions();
    applyCharges.mutate(
      {
        chargeAmount: Number(chargeAmount) || 0,
        extraChargeAmount: Number(extraChargeAmount) || 0,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        chargeDescription: chargeDesc,
        extraChargeDescription: extraDesc,
      },
      {
        onSuccess: () => {
          setApplyDialogOpen(false);
        },
      }

    );
  };

  const handleApply = async () => {
    // اعمال شارژ به صورت خودکار از واحدهایی که قبلاً برای این ماه شارژ دارند صرف‌نظر می‌کند.
    // بنابراین در صورت حذف پرداخت یک واحد، با اعمال مجدد، فقط همان واحد دوباره شارژ می‌شود.
    runApply();
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
              <Label>مبلغ پیش‌فرض شارژ (ریال)</Label>
              <NumericInput
                value={chargeAmount}
                onChange={setChargeAmount}
                placeholder="مثال: 500,000"
              />
            </div>
            <div className="space-y-2">
              <Label>مبلغ پیش‌فرض فوق‌شارژ (ریال)</Label>
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

          {/* Automatic application */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <div className="font-medium text-sm">اعمال خودکار ماهانه</div>
                  <div className="text-xs text-muted-foreground">
                    در روز مشخص هر ماه شمسی، مبلغ پیش‌فرض شارژ و فوق‌شارژ برای همه واحدها اعمال می‌شود.
                  </div>
                </div>
              </div>
              <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            </div>
            {autoEnabled && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">روز ماه:</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={autoDay}
                  onChange={(e) => setAutoDay(e.target.value)}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">
                  (۱ تا ۳۱ — برای ماه‌های کوتاه‌تر، در آخرین روز ماه اعمال می‌شود)
                </span>
              </div>
            )}
          </div>

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
              اعمال دستی
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
                  شارژ: {Number(chargeAmount).toLocaleString("fa-IR")} ریال ×{" "}
                  {units.length} واحد
                </div>
              )}
              {Number(extraChargeAmount) > 0 && (
                <div>
                  فوق‌شارژ: {Number(extraChargeAmount).toLocaleString("fa-IR")}{" "}
                  ریال × {units.length} واحد
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
