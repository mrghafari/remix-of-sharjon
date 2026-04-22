import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Wallet, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { PaymentDialog } from "./PaymentDialog";

type PayPreset = { amount: number; fundType: "charge" | "extra_charge"; description?: string } | null;

interface Props {
  buildingId: string;
  unitId: string;
}

function formatNumber(n: number) {
  return Math.abs(Math.round(n)).toLocaleString("fa-IR");
}

export function ResidentFinance({ buildingId, unitId }: Props) {
  const [payOpen, setPayOpen] = useState(false);
  const [preset, setPreset] = useState<PayPreset>(null);

  const openPay = (p: PayPreset) => { setPreset(p); setPayOpen(true); };

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
  const chargeBalance = totalPayments - totalCharges;

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
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">مجموع پرداختی‌ها</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-600">{formatNumber(totalPayments)}</div>
            <p className="text-xs text-muted-foreground">تومان</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">هزینه‌های تسهیم‌شده</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-red-600">{formatNumber(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">تومان</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">بدهی شارژ</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600">{formatNumber(totalCharges)}</div>
            <p className="text-xs text-muted-foreground">تومان</p>
          </CardContent>
        </Card>
        <Card
          onClick={() => openPay(null)}
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPay(null); } }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium">مانده حساب</CardTitle>
            {balance >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {balance >= 0 ? "" : "-"}{formatNumber(balance)}
            </div>
            <p className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
              <CreditCard className="w-3 h-3" />
              پرداخت آنلاین
            </p>
          </CardContent>
        </Card>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        buildingId={buildingId}
        unitId={unitId}
        defaultAmount={preset ? preset.amount : (balance < 0 ? -balance : 0)}
        defaultFundType={preset?.fundType}
        defaultDescription={preset?.description}
        ownerName={unitInfo?.owner_name}
        residentName={unitInfo?.resident_name}
      />

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
            پرداختی‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">پرداختی ثبت نشده است</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">توضیحات</TableHead>
                  <TableHead className="text-right">نوع</TableHead>
                  <TableHead className="text-right">مبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{formatJalaliDate(p.payment_date)}</TableCell>
                    <TableCell className="text-xs">{p.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">{formatNumber(Number(p.amount))} تومان</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Allocated Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
            هزینه‌های تسهیم‌شده
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenseShares.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">هزینه‌ای تسهیم نشده است</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">عنوان</TableHead>
                  <TableHead className="text-right">سهم شما</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseShares.map((e) => {
                  const expense = e.expenses as any;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{expense ? formatJalaliDate(expense.expense_date) : "-"}</TableCell>
                      <TableCell className="text-xs">{expense?.title || "-"}</TableCell>
                      <TableCell className="font-semibold text-red-600">{formatNumber(Number(e.allocated_amount))} تومان</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charge Debts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            بدهی شارژ ماهانه
          </CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c.id}>
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
                        onClick={() => openPay({
                          amount: Math.round(Number(c.amount)),
                          fundType: c.fund_type as "charge" | "extra_charge",
                          description: `پرداخت بدهی ${c.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"} ${c.year}/${c.month}`,
                        })}
                      >
                        <CreditCard className="w-3 h-3 ml-1" />
                        پرداخت
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
