import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePayments, FundType } from "@/hooks/usePayments";
import { useExpenses } from "@/hooks/useExpenses";
import { formatJalaliDate } from "@/lib/jalaliDate";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(Math.round(amount));
};

const fundInfo = {
  charge: {
    name: "صندوق شارژ",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  extra_charge: {
    name: "صندوق فوق شارژ",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
};

export default function FundTransactions() {
  const { fundType } = useParams<{ fundType: string }>();
  const navigate = useNavigate();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();

  const isLoading = paymentsLoading || expensesLoading;
  const fund = fundInfo[fundType as FundType] || fundInfo.charge;

  const fundPayments = payments.filter((p) => p.fund_type === fundType);
  const fundExpenses = expenses.filter((e) => e.fund_type === fundType);

  const totalIncome = fundPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpense = fundExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;

  const transactions = [
    ...fundPayments.map((p) => ({
      id: p.id,
      type: "credit" as const,
      amount: Number(p.amount),
      date: p.payment_date,
      description: p.description || `واحد ${p.units?.unit_number || "-"}`,
    })),
    ...fundExpenses.map((e) => ({
      id: e.id,
      type: "debit" as const,
      amount: Number(e.amount),
      date: e.expense_date,
      description: e.title,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const transactionsWithBalance = transactions.map((t) => {
    if (t.type === "credit") {
      runningBalance += t.amount;
    } else {
      runningBalance -= t.amount;
    }
    return { ...t, balance: runningBalance };
  });

  const displayTransactions = [...transactionsWithBalance].reverse();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={`text-2xl font-bold ${fund.color}`}>{fund.name}</h1>
            <p className="text-muted-foreground text-sm">لیست تراکنش‌ها</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className={`${fund.bgColor} ${fund.borderColor} border`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                مجموع دریافتی
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatAmount(totalIncome)} ت
              </p>
            </CardContent>
          </Card>

          <Card className={`${fund.bgColor} ${fund.borderColor} border`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                مجموع هزینه
              </div>
              <p className="text-xl font-bold text-red-600">
                {formatAmount(totalExpense)} ت
              </p>
            </CardContent>
          </Card>

          <Card className={`${fund.bgColor} ${fund.borderColor} border`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Wallet className="w-4 h-4" />
                موجودی
              </div>
              <p className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatAmount(Math.abs(balance))} {balance < 0 && "-"} ت
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">دفتر حسابداری</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                در حال بارگذاری...
              </div>
            ) : displayTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                هیچ تراکنشی ثبت نشده
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-right py-3">ردیف</TableHead>
                      <TableHead className="text-right py-3">تاریخ</TableHead>
                      <TableHead className="text-right py-3">شرح</TableHead>
                      <TableHead className="text-right py-3">بدهکار</TableHead>
                      <TableHead className="text-right py-3">بستانکار</TableHead>
                      <TableHead className="text-right py-3">مانده</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayTransactions.map((t, index) => (
                      <TableRow key={t.id}>
                        <TableCell className="py-3 text-right text-muted-foreground">
                          {displayTransactions.length - index}
                        </TableCell>
                        <TableCell className="py-3 text-right text-muted-foreground">
                          {formatJalaliDate(t.date)}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          {t.description}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          {t.type === "debit" ? (
                            <span className="text-red-600 font-medium">
                              {formatAmount(t.amount)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          {t.type === "credit" ? (
                            <span className="text-green-600 font-medium">
                              {formatAmount(t.amount)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right font-bold">
                          <span className={t.balance >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatAmount(Math.abs(t.balance))}
                            {t.balance < 0 && "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
