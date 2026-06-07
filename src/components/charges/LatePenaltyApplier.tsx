import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, Calculator } from "lucide-react";
import { usePaymentPolicy } from "@/hooks/usePaymentPolicy";
import { useUnits } from "@/hooks/useUnits";
import { usePayments } from "@/hooks/usePayments";
import { useExpenseShares } from "@/hooks/useExpenseShares";
import { useExpenses } from "@/hooks/useExpenses";
import { useUnitCharges } from "@/hooks/useUnitCharges";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { endOfJalaliMonth } from "@/lib/jalaliMonthRange";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const persianMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const formatNumber = (n: number) =>
  Math.round(Math.abs(n)).toLocaleString("fa-IR");

const isPenaltyDescription = (d?: string | null) =>
  !!d && (d.startsWith("جریمه تأخیر") || d.startsWith("جریمه "));

export function LatePenaltyApplier() {
  const { data: policy, isLoading: policyLoading } = usePaymentPolicy();
  const { data: units = [] } = useUnits();
  const { data: payments = [] } = usePayments();
  const { data: shares = [] } = useExpenseShares();
  const { data: expenses = [] } = useExpenses();
  const { data: existingCharges = [] } = useUnitCharges();
  const { currentBuildingId } = useBuilding();
  const qc = useQueryClient();

  const now = new Date();
  const currentJalaliMonth = Number(format(now, "M", { locale: faIR }));
  const currentJalaliYear = Number(format(now, "yyyy", { locale: faIR }));

  const [month, setMonth] = useState(String(currentJalaliMonth));
  const [year, setYear] = useState(String(currentJalaliYear));
  const [submitting, setSubmitting] = useState(false);

  const dismissKey = `penalty_dismissed:${currentBuildingId}:${year}-${month}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem(dismissKey) === "1"; }
    catch { return false; }
  });

  // Re-read persistence whenever period or building changes
  useMemo(() => {
    try {
      setDismissed(typeof window !== "undefined" && window.localStorage.getItem(dismissKey) === "1");
    } catch { setDismissed(false); }
  }, [dismissKey]);

  const balanceLoading = !units || !payments || !shares || !existingCharges;

  // Compute candidates per fund. For the selected period itself, grace starts
  // from the manager's actual charge application date; for carry-over debt in
  // later periods, the period end is the time basis.
  const candidates = useMemo(() => {
    if (!policy?.late_penalty_enabled || policy.late_penalty_percent_per_month <= 0) {
      return [];
    }
    const m = Number(month);
    const y = Number(year);
    const graceMs = Math.max(0, policy.late_grace_days || 0) * 86400000;
    const nowMs = Date.now();
    const funds: Array<"charge" | "extra_charge"> = ["charge", "extra_charge"];

    const expenseDateMap = new Map<string, string>();
    for (const e of expenses as any[]) {
      if (e.expense_date) expenseDateMap.set(e.id, e.expense_date.split("T")[0]);
    }

    const rows: Array<{
      unit: any;
      fundType: "charge" | "extra_charge";
      debt: number;
      penalty: number;
      alreadyApplied: boolean;
      withinGrace: boolean;
      graceRemainingDays: number;
    }> = [];

    for (const u of units as any[]) {
      if (u.late_penalty_exempt) continue;
      for (const fundType of funds) {
        const periodChargeDates = (existingCharges as any[])
          .filter((c) =>
            c.unit_id === u.id &&
            c.year === y &&
            c.month === m &&
            c.fund_type === fundType &&
            !isPenaltyDescription(c.description)
          )
          .map((c) => new Date(c.created_at).getTime());
        const applyBaseMs = periodChargeDates.length > 0
          ? Math.max(...periodChargeDates)
          : endOfJalaliMonth(y, m).getTime();
        const graceEndMs = applyBaseMs + graceMs;
        const cutoffIso = new Date(graceEndMs).toISOString().slice(0, 10);

        let paid = 0;
        for (const p of payments as any[]) {
          if (p.unit_id === u.id && p.fund_type === fundType && p.payment_date && p.payment_date <= cutoffIso) {
            paid += Number(p.amount || 0);
          }
        }

        let expenseTotal = 0;
        for (const s of shares as any[]) {
          if (s.unit_id !== u.id) continue;
          const expense = (expenses as any[]).find((e) => e.id === s.expense_id);
          const expenseFund = expense?.fund_type ?? "charge";
          if (expenseFund !== fundType) continue;
          const dateRef = expenseDateMap.get(s.expense_id) || (s.created_at?.split("T")[0]);
          if (dateRef && dateRef <= cutoffIso) expenseTotal += Number(s.allocated_amount || 0);
        }

        let chargeTotal = 0;
        for (const c of existingCharges as any[]) {
          if (c.unit_id !== u.id || c.fund_type !== fundType) continue;
          const isWithinPeriod = c.year < y || (c.year === y && c.month <= m);
          if (!isWithinPeriod || isPenaltyDescription(c.description)) continue;
          chargeTotal += Number(c.amount || 0);
        }

        const debt = Math.max(0, -(paid - (expenseTotal + chargeTotal)));
        const penalty = Math.round((debt * policy.late_penalty_percent_per_month) / 100);
        if (penalty <= 0) continue;
        const alreadyApplied = (existingCharges as any[]).some((c) =>
          c.unit_id === u.id && c.month === m && c.year === y && c.fund_type === fundType && isPenaltyDescription(c.description)
        );
        rows.push({
          unit: u,
          fundType,
          debt,
          penalty,
          alreadyApplied,
          withinGrace: nowMs < graceEndMs,
          graceRemainingDays: Math.max(0, Math.ceil((graceEndMs - nowMs) / 86400000)),
        });
      }
    }

    return rows;
  }, [units, payments, shares, expenses, existingCharges, policy, month, year]);

  const newOnes = candidates.filter((c) => !c.alreadyApplied);
  const readyNewOnes = newOnes.filter((c) => !c.withinGrace);
  const totalPenalty = readyNewOnes.reduce((s, c) => s + c.penalty, 0);
  const withinGrace = newOnes.some((c) => c.withinGrace);
  const graceRemainingDays = Math.max(0, ...newOnes.filter((c) => c.withinGrace).map((c) => c.graceRemainingDays));


  const handleApply = async () => {
    if (!currentBuildingId || readyNewOnes.length === 0) return;
    setSubmitting(true);
    try {
      const records = readyNewOnes.map((c) => ({
        building_id: currentBuildingId,
        unit_id: c.unit.id,
        amount: c.penalty,
        fund_type: c.fundType,
        month: Number(month),
        year: Number(year),
        description: `جریمه ${persianMonths[Number(month) - 1]} ${year}`,
        owner_name: c.unit.owner_name || null,
        resident_name: c.unit.resident_name || null,
      }));
      const { error } = await supabase.from("unit_charges").insert(records);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["unit-charges"] });
      toast({
        title: "جریمه‌ها اعمال شد",
        description: `${records.length} رکورد جریمه به مبلغ کل ${formatNumber(totalPenalty)} ریال ثبت شد.`,
      });
    } catch (e: any) {
      toast({
        title: "خطا در اعمال جریمه",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (policyLoading || balanceLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!policy?.late_penalty_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
            اعمال جریمه تأخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            جریمه تأخیر در تنظیمات فعال نیست. ابتدا از بخش «تنظیمات → خوش‌حسابی و جریمه» آن را فعال کنید.
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
          <AlertTriangle className="w-5 h-5 text-destructive" />
          اعمال جریمه تأخیر ماهانه
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          فرمول: مانده بدهی هر واحد در پایان ماه انتخاب‌شده × {policy.late_penalty_percent_per_month}٪ — جریمه‌های قبلی در محاسبه لحاظ نمی‌شوند.
          {policy.late_grace_days > 0 && (
            <> مهلت آوانس: <strong>{policy.late_grace_days.toLocaleString("fa-IR")} روز</strong> از تاریخ اعمال شارژ این ماه.</>
          )}
        </p>

      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ماه</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {persianMonths.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">سال</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">واحدهای بدهکار:</span>
            <span className="font-medium">{candidates.length.toLocaleString("fa-IR")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">قبلاً جریمه ثبت شده:</span>
            <span className="font-medium">{(candidates.length - newOnes.length).toLocaleString("fa-IR")}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">جدید برای اعمال:</span>
            <span className="font-bold text-destructive">{readyNewOnes.length.toLocaleString("fa-IR")} رکورد</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">جمع جریمه‌های جدید:</span>
            <span className="font-bold text-destructive">{formatNumber(totalPenalty)} ریال</span>
          </div>
        </div>

        {withinGrace && newOnes.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            هنوز در دوره آوانس هستیم — تا <strong>{graceRemainingDays.toLocaleString("fa-IR")} روز</strong> دیگر جریمه قابل اعمال نیست.
            {policy.late_penalty_auto_apply ? " اعمال خودکار پس از پایان آوانس انجام می‌شود." : ""}
          </div>
        )}


        {!dismissed && newOnes.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-right px-3 py-2">واحد</th>
                    <th className="text-right px-3 py-2">مالک</th>
                    <th className="text-right px-3 py-2">صندوق</th>
                    <th className="text-right px-3 py-2">بدهی مبنا</th>
                    <th className="text-right px-3 py-2">جریمه</th>
                    <th className="text-right px-3 py-2">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {newOnes.map((c) => (
                    <tr key={`${c.unit.id}-${c.fundType}`} className="border-t">
                      <td className="px-3 py-2">{c.unit.unit_number}</td>
                      <td className="px-3 py-2">{c.unit.owner_name}</td>
                      <td className="px-3 py-2 text-xs">{c.fundType === "charge" ? "شارژ" : "فوق‌شارژ"}</td>
                      <td className="px-3 py-2">{formatNumber(c.debt)}</td>
                      <td className="px-3 py-2 text-destructive font-medium">
                        {formatNumber(c.penalty)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {c.withinGrace ? "در آوانس" : "آماده اعمال"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!dismissed && newOnes.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDismissed(true);
                try { window.localStorage.setItem(dismissKey, "1"); } catch {}
              }}
              disabled={submitting}
            >
              حذف
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={submitting || readyNewOnes.length === 0}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  اعمال جریمه برای {readyNewOnes.length.toLocaleString("fa-IR")} رکورد
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>تأیید اعمال جریمه</AlertDialogTitle>
                  <AlertDialogDescription>
                    مجموع {formatNumber(totalPenalty)} ریال جریمه برای {readyNewOnes.length.toLocaleString("fa-IR")} رکورد در دوره {persianMonths[Number(month) - 1]} {year} ثبت می‌شود. این عملیات قابل بازگشت نیست (مگر با حذف دستی هر رکورد).
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
        {dismissed && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              پیشنهاد جریمه برای این دوره نادیده گرفته شده است.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDismissed(false);
                try { window.localStorage.removeItem(dismissKey); } catch {}
              }}
            >
              نمایش مجدد
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
