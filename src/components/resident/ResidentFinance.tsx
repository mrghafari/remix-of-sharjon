import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Wallet, CreditCard, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { PaymentDialog } from "./PaymentDialog";

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

  // Fetch unit info for owner/resident snapshot
  const { data: unitInfo } = useQuery({
    queryKey: ["resident_unit_info", unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("owner_name, resident_name").eq("id", unitId).maybeSingle();
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
  const totalCharges = useMemo(() => charges.reduce((s, c) => s + Number(c.amount), 0), [charges]);
  const balance = totalPayments - totalExpenses;

  // تفکیک بدهی شارژ و فوق‌شارژ بر اساس fund_type
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
  const chargeOwed = useMemo(() => {
    const fromCharges = charges.filter((c) => c.fund_type === "charge").reduce((s, c) => s + Number(c.amount), 0);
    return chargeExpenses + fromCharges;
  }, [chargeExpenses, charges]);
  const extraOwed = useMemo(() => {
    const fromCharges = charges.filter((c) => c.fund_type === "extra_charge").reduce((s, c) => s + Number(c.amount), 0);
    return extraExpenses + fromCharges;
  }, [extraExpenses, charges]);

  const chargeDebt = Math.max(0, chargeOwed - chargePaid);
  const extraDebt = Math.max(0, extraOwed - extraPaid);
  const chargeBalance = chargePaid - chargeExpenses;
  const extraBalance = extraPaid - extraExpenses;

  const openPay = (chargeIds?: string[]) => {
    if (chargeIds && chargeIds.length > 0) {
      // Pay only the selected rows: compute amounts split by fund_type
      let charge = 0;
      let extra = 0;
      const idSet = new Set(chargeIds);
      charges.forEach((c) => {
        if (!idSet.has(c.id)) return;
        const amt = Number(c.amount);
        if (c.fund_type === "extra_charge") extra += amt;
        else charge += amt;
      });
      setBulkMode({ charge: Math.round(charge), extra: Math.round(extra) });
      setPayChargeIds(chargeIds);
    } else {
      // پرداخت مانده حساب: هیچ ردیف شارژی نباید حذف شود
      setBulkMode(null);
      setPayChargeIds([]);
    }
    setPayOpen(true);
  };

  // محاسبه تجمیعی موارد انتخاب‌شده با همان الگوریتم تفکیک fund_type
  const selectedTotals = useMemo(() => {
    let charge = 0;
    let extra = 0;
    charges.forEach((c) => {
      if (!selectedChargeIds.has(c.id)) return;
      const amt = Number(c.amount);
      if (c.fund_type === "extra_charge") extra += amt;
      else charge += amt;
    });
    return { charge: Math.round(charge), extra: Math.round(extra) };
  }, [charges, selectedChargeIds]);

  const openBulkPay = () => {
    if (selectedTotals.charge === 0 && selectedTotals.extra === 0) return;
    setBulkMode({ charge: selectedTotals.charge, extra: selectedTotals.extra });
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
                  توجه: بدهی‌های شارژ ماهانه ({formatNumber(totalCharges)} تومان) جداگانه نمایش داده می‌شوند و در این مانده لحاظ نشده‌اند.
                </p>
                <p className="text-[10px] text-amber-600 pt-1 border-t">
                  ⚠ پرداخت بدهی مانده حساب فقط در صورت جابجایی و تغییر مالکیت و یا اتمام قرارداد مستاجر انجام می‌شود.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
            <CardContent className="pt-6">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">پرداختی ثبت نشده است</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">توضیحات</TableHead>
                      <TableHead className="text-right">نوع</TableHead>
                      <TableHead className="text-left">مبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatJalaliDate(p.payment_date)}</TableCell>
                        <TableCell className="text-xs">{p.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600 text-left whitespace-nowrap">
                          {formatNumber(Number(p.amount))} تومان
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allocated Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardContent className="pt-6">
              {expenseShares.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">هزینه‌ای تسهیم نشده است</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">عنوان</TableHead>
                      <TableHead className="text-right">نوع</TableHead>
                      <TableHead className="text-left">سهم شما</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseShares.map((e) => {
                      const expense = e.expenses as any;
                      const fundType = expense?.fund_type ?? "charge";
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs whitespace-nowrap">{expense ? formatJalaliDate(expense.expense_date) : "-"}</TableCell>
                          <TableCell className="text-xs">{expense?.title || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {fundType === "charge" ? "شارژ" : "فوق‌شارژ"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600 text-left whitespace-nowrap">
                            {formatNumber(Number(e.allocated_amount))} تومان
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
            <Button size="sm" onClick={openBulkPay} className="gap-1">
              <CreditCard className="w-3 h-3" />
              پرداخت تجمیعی ({formatNumber(selectedTotals.charge + selectedTotals.extra)} تومان)
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
                  <TableHead className="text-right">عملیات</TableHead>
                  <TableHead className="text-right w-10">
                    <Checkbox
                      checked={selectedChargeIds.size === charges.length && charges.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="انتخاب همه"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c.id} data-state={selectedChargeIds.has(c.id) ? "selected" : undefined}>
                    <TableCell className="text-xs">{c.year}/{c.month}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.description || "-"}</TableCell>
                    <TableCell className="font-semibold text-orange-600">{formatNumber(Number(c.amount))} تومان</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPay([c.id])}
                      >
                        <CreditCard className="w-3 h-3 ml-1" />
                        پرداخت
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={selectedChargeIds.has(c.id)}
                        onCheckedChange={() => toggleChargeSelect(c.id)}
                        aria-label="انتخاب برای پرداخت تجمیعی"
                      />
                    </TableCell>
                  </TableRow>
                ))}
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
