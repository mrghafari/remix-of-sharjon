import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, ChevronLeft } from "lucide-react";
import { usePayments, FundType } from "@/hooks/usePayments";
import { useExpenses } from "@/hooks/useExpenses";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(Math.round(amount));
};

export function FundBalance() {
  const navigate = useNavigate();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

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
          <div
            key={fund.type}
            className={`p-3 rounded-lg border ${fund.borderColor} ${fund.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => navigate(`/fund/${fund.type}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-medium text-sm ${fund.color}`}>{fund.name}</h3>
              <ChevronLeft className={`w-4 h-4 ${fund.color}`} />
            </div>
            
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
          </div>
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
