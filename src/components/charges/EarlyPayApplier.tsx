import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgePercent, Loader2, Calculator } from "lucide-react";
import { usePaymentPolicy } from "@/hooks/usePaymentPolicy";
import { useUnits } from "@/hooks/useUnits";
import { usePayments } from "@/hooks/usePayments";
import { useUnitCharges } from "@/hooks/useUnitCharges";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("fa-IR");

const isDiscountDescription = (d?: string | null) =>
  !!d && d.startsWith("تخفیف خوش‌حسابی");

const isMetaDescription = (d?: string | null) =>
  !!d && (d.startsWith("جریمه") || d.startsWith("تخفیف خوش‌حسابی"));

export function EarlyPayApplier() {
  const { data: policy, isLoading: policyLoading } = usePaymentPolicy();
  const { data: units = [] } = useUnits();
  const { data: payments = [] } = usePayments();
  const { data: existingCharges = [] } = useUnitCharges();
  const { currentBuildingId } = useBuilding();
  const qc = useQueryClient();

  const now = new Date();
  const [month, setMonth] = useState(String(Number(format(now, "M", { locale: faIR }))));
  const [year, setYear] = useState(String(Number(format(now, "yyyy", { locale: faIR }))));
  const [submitting, setSubmitting] = useState(false);

  // Per-unit, per-fund proportional discount: factor depends on how many days
  // after that fund's charge was applied the payment was made.
  //   factor   = max(0, (early_pay_days - daysElapsed)) / early_pay_days
  //   discount = paid * (early_pay_discount_percent / 100) * factor
  const candidates = useMemo(() => {
    if (!policy?.early_pay_enabled || policy.early_pay_discount_percent <= 0) return [];
    const m = Number(month);
    const y = Number(year);
    const windowDays = Math.max(1, policy.early_pay_days || 1);
    const pct = policy.early_pay_discount_percent / 100;
    const funds: Array<"charge" | "extra_charge"> = ["charge", "extra_charge"];

    const rows: Array<{
      unit: any;
      fundType: "charge" | "extra_charge";
      paid: number;
      discount: number;
      alreadyApplied: boolean;
    }> = [];

    for (const u of units as any[]) {
      for (const fundType of funds) {
        const unitCharges = (existingCharges as any[]).filter(
          (c) =>
            c.unit_id === u.id &&
            c.year === y &&
            c.month === m &&
            c.fund_type === fundType &&
            !isMetaDescription(c.description)
        );
        const applyBase = unitCharges.length
          ? Math.max(...unitCharges.map((c) => new Date(c.created_at).getTime()))
          : null;

        let paid = 0;
        let discount = 0;
        if (applyBase != null) {
          for (const p of payments as any[]) {
            if (p.unit_id !== u.id) continue;
            if (p.fund_type !== fundType) continue;
            if (p.month !== m || p.year !== y) continue;
            if (!p.payment_date) continue;
            const pMs = new Date(p.payment_date).getTime();
            if (pMs < applyBase) continue;
            const daysElapsed = Math.floor((pMs - applyBase) / 86400000);
            if (daysElapsed > windowDays) continue;
            const factor = Math.max(0, windowDays - daysElapsed) / windowDays;
            const amt = Number(p.amount || 0);
            paid += amt;
            discount += amt * pct * factor;
          }
        }
        discount = Math.round(discount);
        if (discount <= 0) continue;

        const alreadyApplied = (existingCharges as any[]).some(
          (c) =>
            c.unit_id === u.id &&
            c.month === m &&
            c.year === y &&
            c.fund_type === fundType &&
            isDiscountDescription(c.description)
        );
        rows.push({ unit: u, fundType, paid, discount, alreadyApplied });
      }
    }
    return rows;
  }, [units, payments, existingCharges, policy, month, year]);

  const newOnes = candidates.filter((c) => !c.alreadyApplied);
  const totalDiscount = newOnes.reduce((s, c) => s + c.discount, 0);

  const handleApply = async () => {
    if (!currentBuildingId || newOnes.length === 0) return;
    setSubmitting(true);
    try {
      // Record discounts as NEGATIVE unit_charges (reduce charge/extra-charge,
      // not the fund balance).
      const records = newOnes.map((c) => ({
        building_id: currentBuildingId,
        unit_id: c.unit.id,
        amount: -c.discount,
        fund_type: c.fundType,
        month: Number(month),
        year: Number(year),
        description: `تخفیف خوش‌حسابی ${persianMonths[Number(month) - 1]} ${year}`,
        owner_name: c.unit.owner_name || null,
        resident_name: c.unit.resident_name || null,
      }));
      const { error } = await supabase.from("unit_charges").insert(records);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["unit-charges"] });
      toast({
        title: "تخفیف‌ها اعمال شد",
        description: `${records.length} رکورد تخفیف به مبلغ کل ${fmt(totalDiscount)} ریال ثبت شد.`,
      });
    } catch (e: any) {
      toast({ title: "خطا در اعمال تخفیف", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (policyLoading) {
    return (
      <Card><CardContent className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </CardContent></Card>
    );
  }

  if (!policy?.early_pay_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-muted-foreground" />
            اعمال تخفیف خوش‌حسابی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            تخفیف خوش‌حسابی در تنظیمات فعال نیست. ابتدا از بخش «تنظیمات → خوش‌حسابی و جریمه» آن را فعال کنید.
          </p>
        </CardContent>
      </Card>
    );
  }

  const years = Array.from({ length: 9 }, (_, i) => 1402 + i);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgePercent className="w-5 h-5 text-emerald-600" />
          اعمال تخفیف خوش‌حسابی
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          فرمول: برای هر پرداخت شارژ در دوره، اگر در پنجره <strong>{policy.early_pay_days.toLocaleString("fa-IR")}</strong> روز پس از اعمال شارژ انجام شود، تخفیف = مبلغ × <strong>{policy.early_pay_discount_percent}٪</strong> × ((روزهای پنجره − روزهای سپری‌شده) ÷ روزهای پنجره). هرچه زودتر بپردازد، تخفیف بیشتر است.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ماه</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {persianMonths.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">سال</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">واحدهای واجد شرایط:</span>
            <span className="font-medium">{candidates.length.toLocaleString("fa-IR")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">قبلاً تخفیف ثبت شده:</span>
            <span className="font-medium">{(candidates.length - newOnes.length).toLocaleString("fa-IR")}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">جدید برای اعمال:</span>
            <span className="font-bold text-emerald-700">{newOnes.length.toLocaleString("fa-IR")} واحد</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">جمع تخفیف‌های جدید:</span>
            <span className="font-bold text-emerald-700">{fmt(totalDiscount)} ریال</span>
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-right px-3 py-2">واحد</th>
                    <th className="text-right px-3 py-2">مالک/ساکن</th>
                    <th className="text-right px-3 py-2">صندوق</th>
                    <th className="text-right px-3 py-2">پرداخت واجد شرایط</th>
                    <th className="text-right px-3 py-2">تخفیف</th>
                    <th className="text-right px-3 py-2">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={`${c.unit.id}-${c.fundType}`} className="border-t">
                      <td className="px-3 py-2">{c.unit.unit_number}</td>
                      <td className="px-3 py-2">{c.unit.resident_name || c.unit.owner_name}</td>
                      <td className="px-3 py-2 text-xs">{c.fundType === "charge" ? "شارژ" : "فوق شارژ"}</td>
                      <td className="px-3 py-2">{fmt(c.paid)}</td>
                      <td className="px-3 py-2 text-emerald-700 font-medium">{fmt(c.discount)}</td>
                      <td className="px-3 py-2 text-xs">
                        {c.alreadyApplied ? <span className="text-muted-foreground">ثبت شده</span> : <span className="text-emerald-700">جدید</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {newOnes.length > 0 && (
          <div className="flex items-center justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={submitting} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  اعمال تخفیف برای {newOnes.length.toLocaleString("fa-IR")} واحد
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>تأیید اعمال تخفیف</AlertDialogTitle>
                  <AlertDialogDescription>
                    مجموع {fmt(totalDiscount)} ریال تخفیف خوش‌حسابی برای {newOnes.length.toLocaleString("fa-IR")} واحد در دوره {persianMonths[Number(month) - 1]} {year} به‌صورت بستانکاری ثبت می‌شود.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>انصراف</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApply}>تأیید و ثبت</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
