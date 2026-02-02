import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { usePayments, FundType } from "@/hooks/usePayments";
import { useExpenses } from "@/hooks/useExpenses";
import { formatJalaliDate } from "@/lib/jalaliDate";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

function FundTransactions({ fundType }: { fundType: FundType }) {
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const fundPayments = payments.filter((p) => p.fund_type === fundType);
  const fundExpenses = expenses.filter((e) => e.fund_type === fundType);

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

  if (displayTransactions.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        هیچ تراکنشی ثبت نشده
      </div>
    );
  }

  return (
    <div className="mt-2 border rounded-lg overflow-hidden" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-right text-xs py-2 h-8">تاریخ</TableHead>
            <TableHead className="text-right text-xs py-2 h-8">شرح</TableHead>
            <TableHead className="text-right text-xs py-2 h-8 w-20">بدهکار</TableHead>
            <TableHead className="text-right text-xs py-2 h-8 w-20">بستانکار</TableHead>
            <TableHead className="text-right text-xs py-2 h-8 w-24">مانده</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayTransactions.slice(0, 10).map((t) => (
            <TableRow key={t.id} className="text-xs">
              <TableCell className="py-1.5 text-right text-muted-foreground">
                {formatJalaliDate(t.date)}
              </TableCell>
              <TableCell className="py-1.5 text-right max-w-[120px] truncate">
                {t.description}
              </TableCell>
              <TableCell className="py-1.5 text-right">
                {t.type === "debit" ? (
                  <span className="text-red-600">{formatAmount(t.amount)}</span>
                ) : "-"}
              </TableCell>
              <TableCell className="py-1.5 text-right">
                {t.type === "credit" ? (
                  <span className="text-green-600">{formatAmount(t.amount)}</span>
                ) : "-"}
              </TableCell>
              <TableCell className="py-1.5 text-right font-medium">
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
  );
}

export function FundBalance() {
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const [openFund, setOpenFund] = useState<FundType | null>(null);

  const chargePayments = payments
    .filter((p) => p.fund_type === "charge")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const extraChargePayments = payments
    .filter((p) => p.fund_type === "extra_charge")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const chargeExpenses = expenses
    .filter((e) => e.fund_type === "charge")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const extraChargeExpenses = expenses
    .filter((e) => e.fund_type === "extra_charge")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const chargeBalance = chargePayments - chargeExpenses;
  const extraChargeBalance = extraChargePayments - extraChargeExpenses;

  const funds = [
    {
      name: "صندوق شارژ",
      type: "charge" as FundType,
      balance: chargeBalance,
      income: chargePayments,
      expense: chargeExpenses,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      name: "صندوق فوق شارژ",
      type: "extra_charge" as FundType,
      balance: extraChargeBalance,
      income: extraChargePayments,
      expense: extraChargeExpenses,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
    },
  ];

  return (
    <Card className="animate-fade-in h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-4 h-4" />
          موجودی صندوق‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {funds.map((fund) => (
          <Collapsible
            key={fund.type}
            open={openFund === fund.type}
            onOpenChange={(open) => setOpenFund(open ? fund.type : null)}
          >
            <div className={`p-3 rounded-lg border ${fund.borderColor} ${fund.bgColor}`}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-medium text-sm ${fund.color}`}>{fund.name}</h3>
                  <ChevronDown
                    className={`w-4 h-4 ${fund.color} transition-transform ${
                      openFund === fund.type ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CollapsibleTrigger>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    دریافتی
                  </div>
                  <span className="font-medium text-green-600">
                    {formatAmount(fund.income)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    هزینه
                  </div>
                  <span className="font-medium text-red-600">
                    {formatAmount(fund.expense)}
                  </span>
                </div>
                
                <div className="border-t pt-1.5 mt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">موجودی</span>
                    <span
                      className={`text-sm font-bold ${
                        fund.balance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatAmount(fund.balance)} ت
                    </span>
                  </div>
                </div>
              </div>

              <CollapsibleContent>
                <FundTransactions fundType={fund.type} />
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
        
        {/* Total Balance */}
        <div className="p-3 rounded-lg bg-gradient-to-l from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">موجودی کل</span>
            <span
              className={`text-sm font-bold ${
                chargeBalance + extraChargeBalance >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatAmount(chargeBalance + extraChargeBalance)} ت
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
