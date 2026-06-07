import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Wallet, CreditCard, Loader2, Info, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { PaymentDialog } from "./PaymentDialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import {
  exportPaymentsExcel,
  exportPaymentsPdf,
  exportExpensesExcel,
  exportExpensesPdf,
  inDateRange,
} from "@/lib/residentExport";
import { useMyUnitModules } from "@/hooks/useUnitModuleAccess";

interface Props {
  buildingId: string;
  unitId: string;
  /** نقش فرد لاگین‌شده در این واحد */
  viewerRole?: "resident" | "owner";
}

function formatNumber(n: number) {
  return Math.abs(Math.round(n)).toLocaleString("fa-IR");
}

export function ResidentFinance({ buildingId, unitId, viewerRole = "resident" }: Props) {
  const [payOpen, setPayOpen] = useState(false);
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<{ charge: number; extra: number } | null>(null);
  const [payChargeIds, setPayChargeIds] = useState<string[]>([]);
  const [paymentsFrom, setPaymentsFrom] = useState<Date | undefined>();
  const [paymentsTo, setPaymentsTo] = useState<Date | undefined>();
  const [expensesFrom, setExpensesFrom] = useState<Date | undefined>();
  const [expensesTo, setExpensesTo] = useState<Date | undefined>();

  const { data: grantedModules = [] } = useMyUnitModules(buildingId, unitId, viewerRole);
  const canSeeBalance = grantedModules.includes("unit_balance");


  // Fetch unit info for owner/resident snapshot
  const { data: unitInfo } = useQuery({
    queryKey: ["resident_unit_info", unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("unit_number, owner_name, resident_name").eq("id", unitId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch payments for this unit
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["resident_payments", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("unit_id", unitId)
        .eq("building_id", buildingId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch expense shares for this unit
  const { data: expenseShares = [], isLoading: sharesLoading } = useQuery({
    queryKey: ["resident_expense_shares", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_unit_shares")
        .select("*, expenses(title, expense_date, category, fund_type, allocation_type)")
        .eq("unit_id", unitId)
        .eq("building_id", buildingId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch charges for this unit
  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ["resident_charges", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_charges")
        .select("*")
        .eq("unit_id", unitId)
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = paymentsLoading || sharesLoading || chargesLoading;

  const totalPayments = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const totalExpenses = useMemo(() => expenseShares.reduce((s, e) => s + Number(e.allocated_amount), 0), [expenseShares]);
  // تخفیف خوش‌حسابی به صورت رکورد منفی در unit_charges ذخیره می‌شود (کاهنده)
  const isDiscount = (c: any) => Number(c.amount) < 0;
  // مانده با علامت (برای تخفیف منفی می‌ماند)
  const outstandingSigned = (c: any) => Number(c.amount) - Number(c.paid_amount || 0);
  // مانده مثبت برای ردیف بدهی معمولی
  const remainingOf = (c: any) => Math.max(0, outstandingSigned(c));
  const signedRemain = (c: any) => (isDiscount(c) ? outstandingSigned(c) : remainingOf(c));
  const totalCharges = useMemo(() => charges.reduce((s, c: any) => s + signedRemain(c), 0), [charges]);
  const balance = totalPayments - totalExpenses;

  const chargePaid = useMemo(
    () => payments.filter((p) => p.fund_type === "charge").reduce((s, p) => s + Number(p.amount), 0),
    [payments]
  );
  const extraPaid = useMemo(
    () => payments.filter((p) => p.fund_type === "extra_charge").reduce((s, p) => s + Number(p.amount), 0),
    [payments]
  );
  const chargeExpenses = useMemo(
    () => expenseShares.filter((e: any) => (e.expenses?.fund_type ?? "charge") === "charge").reduce((s, e) => s + Number(e.allocated_amount), 0),
    [expenseShares]
  );
  const extraExpenses = useMemo(
    () => expenseShares.filter((e: any) => e.expenses?.fund_type === "extra_charge").reduce((s, e) => s + Number(e.allocated_amount), 0),
    [expenseShares]
  );
  const chargeDebt = useMemo(
    () => charges.filter((c: any) => c.fund_type === "charge").reduce((s, c: any) => s + signedRemain(c), 0),
    [charges]
  );
  const extraDebt = useMemo(
    () => charges.filter((c: any) => c.fund_type === "extra_charge").reduce((s, c: any) => s + signedRemain(c), 0),
    [charges]
  );
  const chargeBalance = chargePaid - chargeExpenses;
  const extraBalance = extraPaid - extraExpenses;

  const openPay = (chargeIds?: string[]) => {
    if (chargeIds && chargeIds.length > 0) {
      let charge = 0;
      let extra = 0;
      const idSet = new Set(chargeIds);
      charges.forEach((c: any) => {
        if (!idSet.has(c.id)) return;
        const amt = signedRemain(c);
        if (amt === 0) return;
        if (c.fund_type === "extra_charge") extra += amt;
        else charge += amt;
      });
      setBulkMode({ charge: Math.max(0, Math.round(charge)), extra: Math.max(0, Math.round(extra)) });
      setPayChargeIds(chargeIds);
    } else {
      setBulkMode(null);
      setPayChargeIds([]);
    }
    setPayOpen(true);
  };

  const selectedBreakdown = useMemo(() => {
    const map = {
      charge: { net: 0, hasNonDiscount: false, hasDiscount: false },
      extra_charge: { net: 0, hasNonDiscount: false, hasDiscount: false },
    };
    charges.forEach((c: any) => {
      if (!selectedChargeIds.has(c.id)) return;
      const amt = signedRemain(c);
      if (amt === 0) return;
      const ft: "charge" | "extra_charge" = c.fund_type === "extra_charge" ? "extra_charge" : "charge";
      map[ft].net += amt;
      if (isDiscount(c)) map[ft].hasDiscount = true;
      else map[ft].hasNonDiscount = true;
    });
    return map;
  }, [charges, selectedChargeIds]);

  const selectedTotals = {
    charge: Math.round(selectedBreakdown.charge.net),
    extra: Math.round(selectedBreakdown.extra_charge.net),
  };
  const bulkNet = selectedTotals.charge + selectedTotals.extra;
  // اگر تخفیف خوش‌حسابی انتخاب شده، باید با شارژ/فوق‌شارژ از همان جنس همراه شود و خالص آن جنس نباید منفی شود
  const canBulkPay = (() => {
    const fc = selectedBreakdown.charge;
    const fe = selectedBreakdown.extra_charge;
    if (fc.hasDiscount && (!fc.hasNonDiscount || fc.net < 0)) return false;
    if (fe.hasDiscount && (!fe.hasNonDiscount || fe.net < 0)) return false;
    return (fc.hasNonDiscount || fe.hasNonDiscount) && bulkNet > 0;
  })();

  const openBulkPay = () => {
    if (!canBulkPay) return;
    setBulkMode({
      charge: Math.max(0, selectedTotals.charge),
      extra: Math.max(0, selectedTotals.extra),
    });
    setPayChargeIds(Array.from(selectedChargeIds));
    setPayOpen(true);
  };

  const toggleChargeSelect = (id: string) => {
    setSelectedChargeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedChargeIds.size === charges.length) setSelectedChargeIds(new Set());
    else setSelectedChargeIds(new Set(charges.map((c) => c.id)));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">مجموع پرداختی‌ها</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ساکن</span>
              <span className="font-bold text-emerald-600">{formatNumber(chargePaid)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">مالک</span>
              <span className="font-bold text-emerald-600">{formatNumber(extraPaid)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">هزینه‌های تسهیم‌شده</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ساکن</span>
              <span className="font-bold text-red-600">{formatNumber(chargeExpenses)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">مالک</span>
              <span className="font-bold text-red-600">{formatNumber(extraExpenses)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">بدهی</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ساکن</span>
              <span className="font-bold text-orange-600">{formatNumber(chargeDebt)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">مالک</span>
              <span className="font-bold text-purple-600">{formatNumber(extraDebt)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">شارژ ماهانه</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ساکن</span>
              <span className="font-bold text-orange-600">
                {formatNumber(charges.filter((c) => c.fund_type === "charge").reduce((s, c) => s + Number(c.amount), 0))}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">مالک</span>
              <span className="font-bold text-purple-600">
                {formatNumber(charges.filter((c) => c.fund_type === "extra_charge").reduce((s, c) => s + Number(c.amount), 0))}
              </span>
            </div>
          </CardContent>
        </Card>
        {canSeeBalance && (
        <TooltipProvider delayDuration={150}>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card
                onClick={() => openPay()}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPay(); } }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium flex items-center gap-1">
                    مانده حساب
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </CardTitle>
                  {balance >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">ساکن</span>
                    <span className={`font-bold ${chargeBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {chargeBalance >= 0 ? "" : "-"}{formatNumber(chargeBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">مالک</span>
                    <span className={`font-bold ${extraBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {extraBalance >= 0 ? "" : "-"}{formatNumber(extraBalance)}
                    </span>
                  </div>
                  <p className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1 border-t mt-1">
                    <CreditCard className="w-3 h-3" />
                    پرداخت آنلاین
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2 text-xs" dir="rtl">
                <p className="font-semibold border-b pb-1">فرمول محاسبه مانده حساب</p>
                <p className="text-muted-foreground">
                  مانده = مجموع پرداختی‌ها − مجموع هزینه‌های تسهیم‌شده
                </p>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-emerald-600">+ مجموع پرداختی‌ها:</span>
                    <span className="font-mono">{formatNumber(totalPayments)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-red-600">− هزینه‌های تسهیم‌شده:</span>
                    <span className="font-mono">{formatNumber(totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
                    <span>= مانده حساب:</span>
                    <span className={`font-mono ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {balance >= 0 ? "" : "-"}{formatNumber(balance)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1 border-t">
                  توجه: بدهی‌های شارژ ماهانه ({formatNumber(totalCharges)} ریال) جداگانه نمایش داده می‌شوند و در این مانده لحاظ نشده‌اند.
                </p>
                <p className="text-[10px] text-amber-600 pt-1 border-t">
                  ⚠ پرداخت بدهی مانده حساب فقط در صورت جابجایی و تغییر مالکیت و یا اتمام قرارداد مستاجر انجام می‌شود.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        )}
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o);
          if (!o) {
            setBulkMode(null);
            setSelectedChargeIds(new Set());
            setPayChargeIds([]);
          }
        }}
        buildingId={buildingId}
        unitId={unitId}
        chargeDebt={bulkMode ? bulkMode.charge : Math.max(0, -chargeBalance)}
        extraDebt={bulkMode ? bulkMode.extra : Math.max(0, -extraBalance)}
        defaultRole={viewerRole}
        defaultDescription={bulkMode ? "پرداخت تجمیعی بدهی‌های انتخاب‌شده" : undefined}
        ownerName={unitInfo?.owner_name}
        residentName={unitInfo?.resident_name}
        chargeFundIdsToClear={charges.filter((c) => payChargeIds.includes(c.id) && c.fund_type === "charge").map((c) => c.id)}
        extraFundIdsToClear={charges.filter((c) => payChargeIds.includes(c.id) && c.fund_type === "extra_charge").map((c) => c.id)}
      />

      {/* Tabbed Tables */}
      <Tabs defaultValue="debts" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="debts" className="gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            بدهی شارژ ماهانه
            {charges.length > 0 && (
              <Badge variant="secondary" className="text-xs">{charges.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
            پرداختی‌ها
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
            هزینه‌های تسهیم‌شده
          </TabsTrigger>
        </TabsList>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <ExportToolbar
                from={paymentsFrom}
                to={paymentsTo}
                onFromChange={setPaymentsFrom}
                onToChange={setPaymentsTo}
                onExportExcel={() => {
                  const rows = payments.filter((p: any) => inDateRange(p.payment_date, paymentsFrom, paymentsTo));
                  exportPaymentsExcel(rows as any, unitInfo?.unit_number || "", paymentsFrom, paymentsTo);
                }}
                onExportPdf={async () => {
                  const rows = payments.filter((p: any) => inDateRange(p.payment_date, paymentsFrom, paymentsTo));
                  await exportPaymentsPdf(rows as any, unitInfo?.unit_number || "", paymentsFrom, paymentsTo);
                }}
                disabled={payments.length === 0}
              />
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">پرداختی ثبت نشده است</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">شخص</TableHead>
                      <TableHead className="text-right">نقش</TableHead>
                      <TableHead className="text-right">مدیر</TableHead>
                      <TableHead className="text-right">توضیحات</TableHead>
                      <TableHead className="text-right">نوع</TableHead>
                      <TableHead className="text-left">مبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments
                      .filter((p: any) => inDateRange(p.payment_date, paymentsFrom, paymentsTo))
                      .map((p: any) => {
                      const personName = p.resident_name || p.owner_name || "-";
                      const roleLabel = p.resident_name ? "ساکن" : (p.owner_name ? "مالک" : "-");
                      return (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatJalaliDate(p.payment_date)}</TableCell>
                        <TableCell className="text-xs">{personName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{p.manager_name || "-"}</TableCell>
                        <TableCell className="text-xs">{p.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600 text-left whitespace-nowrap">
                          {formatNumber(Number(p.amount))} ریال
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocated Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <ExportToolbar
                from={expensesFrom}
                to={expensesTo}
                onFromChange={setExpensesFrom}
                onToChange={setExpensesTo}
                onExportExcel={() => {
                  const rows = expenseShares.filter((e: any) => inDateRange(e.expenses?.expense_date, expensesFrom, expensesTo));
                  exportExpensesExcel(rows as any, unitInfo?.unit_number || "", expensesFrom, expensesTo);
                }}
                onExportPdf={async () => {
                  const rows = expenseShares.filter((e: any) => inDateRange(e.expenses?.expense_date, expensesFrom, expensesTo));
                  await exportExpensesPdf(rows as any, unitInfo?.unit_number || "", expensesFrom, expensesTo);
                }}
                disabled={expenseShares.length === 0}
              />
              {expenseShares.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">هزینه‌ای تسهیم نشده است</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">عنوان</TableHead>
                      <TableHead className="text-right">شخص</TableHead>
                      <TableHead className="text-right">نقش</TableHead>
                      <TableHead className="text-right">مدیر</TableHead>
                      <TableHead className="text-right">نوع</TableHead>
                      <TableHead className="text-left">سهم شما</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseShares
                      .filter((e: any) => inDateRange(e.expenses?.expense_date, expensesFrom, expensesTo))
                      .map((e: any) => {
                      const expense = e.expenses as any;
                      const fundType = expense?.fund_type ?? "charge";
                      const isExtra = fundType === "extra_charge";
                      const preferred = isExtra ? e.owner_name : e.resident_name;
                      const fallback = isExtra ? e.resident_name : e.owner_name;
                      const personName = preferred || fallback || "-";
                      const roleLabel = preferred
                        ? (isExtra ? "مالک" : "ساکن")
                        : (fallback ? (isExtra ? "ساکن" : "مالک") : "-");
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs whitespace-nowrap">{expense ? formatJalaliDate(expense.expense_date) : "-"}</TableCell>
                          <TableCell className="text-xs">{expense?.title || "-"}</TableCell>
                          <TableCell className="text-xs">{personName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{e.manager_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {fundType === "charge" ? "شارژ" : "فوق‌شارژ"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600 text-left whitespace-nowrap">
                            {formatNumber(Number(e.allocated_amount))} ریال
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charge Debts Tab */}
        <TabsContent value="debts">

      {/* Charge Debts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            بدهی شارژ ماهانه
          </CardTitle>
          {selectedChargeIds.size > 0 && (
            <Button size="sm" onClick={openBulkPay} disabled={!canBulkPay} className="gap-1">
              <CreditCard className="w-3 h-3" />
              پرداخت تجمیعی ({formatNumber(Math.max(0, bulkNet))} ریال)
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">بدهی شارژی ثبت نشده است</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">دوره</TableHead>
                  <TableHead className="text-right">نوع</TableHead>
                  <TableHead className="text-right">توضیحات</TableHead>
                  <TableHead className="text-right">مبلغ</TableHead>
                  <TableHead className="text-right">پرداخت‌شده</TableHead>
                  <TableHead className="text-right">مانده</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                  <TableHead className="text-right w-10">
                    <Checkbox
                      checked={
                        charges.filter((c: any) => isDiscount(c) || remainingOf(c) > 0).length > 0 &&
                        selectedChargeIds.size === charges.filter((c: any) => isDiscount(c) || remainingOf(c) > 0).length
                      }
                      onCheckedChange={() => {
                        const payable = charges.filter((c: any) => isDiscount(c) || remainingOf(c) > 0).map((c) => c.id);
                        if (selectedChargeIds.size === payable.length) setSelectedChargeIds(new Set());
                        else setSelectedChargeIds(new Set(payable));
                      }}
                      aria-label="انتخاب همه"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c: any) => {
                  const paid = Number(c.paid_amount || 0);
                  const discount = isDiscount(c);
                  const remaining = remainingOf(c);
                  const signedAmt = Number(c.amount);
                  const isFullyPaid = !discount && remaining <= 0 && (paid > 0 || c.paid_at);
                  const isPartiallyPaid = !discount && paid > 0 && remaining > 0;
                  return (
                  <TableRow
                    key={c.id}
                    data-state={selectedChargeIds.has(c.id) ? "selected" : undefined}
                    className={isFullyPaid ? "opacity-60" : undefined}
                  >
                    <TableCell className="text-xs">{c.year}/{c.month}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.description || "-"}</TableCell>
                    <TableCell className={`font-semibold ${discount ? "text-emerald-600" : "text-orange-600"}`}>
                      {discount ? "-" : ""}{formatNumber(signedAmt)} ریال
                    </TableCell>
                    <TableCell className="text-emerald-600 text-xs">{paid > 0 ? `${formatNumber(paid)} ریال` : "-"}</TableCell>
                    <TableCell className={`font-semibold text-xs ${discount ? "text-emerald-600" : ""}`}>
                      {discount ? `-${formatNumber(signedAmt)} ریال` : (remaining > 0 ? `${formatNumber(remaining)} ریال` : "0")}
                    </TableCell>
                    <TableCell>
                      {discount ? (
                        <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">دریافت</Badge>
                      ) : isFullyPaid ? (
                        <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">پرداخت شده</Badge>
                      ) : isPartiallyPaid ? (
                        <Badge variant="secondary" className="text-xs">پرداخت جزئی</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">پرداخت نشده</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPay([c.id])}
                        disabled={discount || remaining <= 0}
                        title={discount ? "تخفیف تنها قابل دریافت نیست؛ به‌همراه شارژ/فوق‌شارژ هم‌نوع انتخاب شود" : undefined}
                      >
                        <CreditCard className="w-3 h-3 ml-1" />
                        {discount ? "دریافت" : "پرداخت"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={selectedChargeIds.has(c.id)}
                        onCheckedChange={() => toggleChargeSelect(c.id)}
                        aria-label="انتخاب برای پرداخت تجمیعی"
                        disabled={!discount && remaining <= 0}
                      />
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ExportToolbarProps {
  from?: Date;
  to?: Date;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
  onExportExcel: () => void;
  onExportPdf: () => void | Promise<void>;
  disabled?: boolean;
}

function ExportToolbar({ from, to, onFromChange, onToChange, onExportExcel, onExportPdf, disabled }: ExportToolbarProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await onExportPdf();
    } finally {
      setPdfLoading(false);
    }
  };
  return (
    <div className="flex flex-nowrap items-center gap-2 p-2 rounded-lg bg-muted/40 border overflow-x-auto">
      <span className="text-xs text-muted-foreground">از</span>
      <JalaliDatePicker value={from} onChange={onFromChange} placeholder="از تاریخ" buttonClassName="h-8 text-xs px-2 min-w-[110px]" />
      <span className="text-xs text-muted-foreground">تا</span>
      <JalaliDatePicker value={to} onChange={onToChange} placeholder="تا تاریخ" buttonClassName="h-8 text-xs px-2 min-w-[110px]" />
      {(from || to) && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { onFromChange(undefined); onToChange(undefined); }}>
          پاک کردن
        </Button>
      )}
      <div className="flex-1" />
      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onExportExcel} disabled={disabled}>
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
        خروجی Excel
      </Button>
      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handlePdf} disabled={disabled || pdfLoading}>
        {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-red-600" />}
        خروجی PDF
      </Button>
    </div>
  );
}

