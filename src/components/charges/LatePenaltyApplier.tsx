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
import { endOfJalaliMonthIso } from "@/lib/jalaliMonthRange";
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
  const [dismissed, setDismissed] = useState(false);

  const balanceLoading = !units || !payments || !shares || !existingCharges;

  // Compute candidates based on END-OF-MONTH balance, EXCLUDING penalty rows
  const candidates = useMemo(() => {
    if (!policy?.late_penalty_enabled || policy.late_penalty_percent_per_month <= 0) {
      return [];
    }
    const m = Number(month);
    const y = Number(year);
    const cutoffIso = endOfJalaliMonthIso(y, m); // YYYY-MM-DD

    // Sum payments per unit up to end of selected jalali month
    const paySum = new Map<string, number>();
    for (const p of payments as any[]) {
      if (p.payment_date && p.payment_date <= cutoffIso) {
        paySum.set(p.unit_id, (paySum.get(p.unit_id) || 0) + Number(p.amount || 0));
      }
    }

    // Sum allocated expense shares per unit up to end of selected jalali month
    const expenseDateMap = new Map<string, string>();
    for (const e of expenses as any[]) {
      if (e.expense_date) expenseDateMap.set(e.id, e.expense_date.split("T")[0]);
    }
    const expSum = new Map<string, number>();
    for (const s of shares as any[]) {
      const dateRef = expenseDateMap.get(s.expense_id) || (s.created_at?.split("T")[0]);
      if (dateRef && dateRef <= cutoffIso) {
        expSum.set(s.unit_id, (expSum.get(s.unit_id) || 0) + Number(s.allocated_amount || 0));
      }
    }

    // Sum unit_charges per unit up to and INCLUDING (year, month) but EXCLUDING penalty descriptions
    const chargeSum = new Map<string, number>();
    for (const c of existingCharges as any[]) {
      const isWithinPeriod =
        c.year < y || (c.year === y && c.month <= m);
      if (!isWithinPeriod) continue;
      if (isPenaltyDescription(c.description)) continue; // exclude penalties themselves
      chargeSum.set(c.unit_id, (chargeSum.get(c.unit_id) || 0) + Number(c.amount || 0));
    }

    return units
      .filter((u: any) => !u.late_penalty_exempt)
      .map((u: any) => {
        const paid = paySum.get(u.id) || 0;
        const expenses = expSum.get(u.id) || 0;
        const charges = chargeSum.get(u.id) || 0;
        // balance = paid - (expenses + charges); negative means debtor
        const balance = paid - (expenses + charges);
        const debt = balance < 0 ? Math.abs(balance) : 0;
        const penalty = Math.round((debt * policy.late_penalty_percent_per_month) / 100);
        const alreadyApplied = (existingCharges as any[]).some(
          (c) =>
            c.unit_id === u.id &&
            c.month === m &&
            c.year === y &&
            isPenaltyDescription(c.description)
        );
        return { unit: u, debt, penalty, alreadyApplied };
      })
      .filter((c) => c.penalty > 0);
  }, [units, payments, shares, expenses, existingCharges, policy, month, year]);

  const newOnes = candidates.filter((c) => !c.alreadyApplied);
  const totalPenalty = newOnes.reduce((s, c) => s + c.penalty, 0);

  const handleApply = async () => {
    if (!currentBuildingId || newOnes.length === 0) return;
    setSubmitting(true);
    try {
      const records = newOnes.map((c) => ({
        building_id: currentBuildingId,
        unit_id: c.unit.id,
        amount: c.penalty,
        fund_type: "charge" as const,
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
        description: `${records.length} رکورد جریمه به مبلغ کل ${formatNumber(totalPenalty)} تومان ثبت شد.`,
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
            <span className="font-bold text-destructive">{newOnes.length.toLocaleString("fa-IR")} واحد</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">جمع جریمه‌های جدید:</span>
            <span className="font-bold text-destructive">{formatNumber(totalPenalty)} تومان</span>
          </div>
        </div>

        {newOnes.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-right px-3 py-2">واحد</th>
                    <th className="text-right px-3 py-2">مالک</th>
                    <th className="text-right px-3 py-2">بدهی پایان ماه</th>
                    <th className="text-right px-3 py-2">جریمه</th>
                  </tr>
                </thead>
                <tbody>
                  {newOnes.map((c) => (
                    <tr key={c.unit.id} className="border-t">
                      <td className="px-3 py-2">{c.unit.unit_number}</td>
                      <td className="px-3 py-2">{c.unit.owner_name}</td>
                      <td className="px-3 py-2">{formatNumber(c.debt)}</td>
                      <td className="px-3 py-2 text-destructive font-medium">
                        {formatNumber(c.penalty)}
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
              onClick={() => setDismissed(true)}
              disabled={submitting}
            >
              حذف
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={submitting}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  اعمال جریمه برای {newOnes.length.toLocaleString("fa-IR")} واحد
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>تأیید اعمال جریمه</AlertDialogTitle>
                  <AlertDialogDescription>
                    مجموع {formatNumber(totalPenalty)} تومان جریمه برای {newOnes.length.toLocaleString("fa-IR")} واحد در دوره {persianMonths[Number(month) - 1]} {year} ثبت می‌شود. این عملیات قابل بازگشت نیست (مگر با حذف دستی هر رکورد).
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
          <p className="text-xs text-muted-foreground text-center">
            پیشنهاد جریمه نادیده گرفته شد.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
