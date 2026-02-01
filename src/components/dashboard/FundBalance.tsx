import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { useExpenses } from "@/hooks/useExpenses";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

export function FundBalance() {
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  // Calculate totals for each fund type
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
      balance: chargeBalance,
      income: chargePayments,
      expense: chargeExpenses,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      name: "صندوق فوق شارژ",
      balance: extraChargeBalance,
      income: extraChargePayments,
      expense: extraChargeExpenses,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
    },
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          موجودی صندوق‌ها
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {funds.map((fund, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${fund.borderColor} ${fund.bgColor}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${fund.color}`}>{fund.name}</h3>
                <ArrowLeftRight className={`w-4 h-4 ${fund.color}`} />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    دریافتی
                  </div>
                  <span className="font-medium text-green-600">
                    {formatAmount(fund.income)} تومان
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    هزینه‌ها
                  </div>
                  <span className="font-medium text-red-600">
                    {formatAmount(fund.expense)} تومان
                  </span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">موجودی</span>
                    <span
                      className={`text-lg font-bold ${
                        fund.balance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatAmount(fund.balance)} تومان
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total Balance */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-l from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-semibold">موجودی کل</span>
            <span
              className={`text-xl font-bold ${
                chargeBalance + extraChargeBalance >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatAmount(chargeBalance + extraChargeBalance)} تومان
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
