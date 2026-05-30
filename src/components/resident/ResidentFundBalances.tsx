import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

interface Props { buildingId: string; }

export function ResidentFundBalances({ buildingId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["resident_fund_balances", buildingId],
    queryFn: async () => {
      const [pRes, eRes] = await Promise.all([
        supabase.from("payments").select("amount, fund_type").eq("building_id", buildingId),
        supabase.from("expenses").select("amount, fund_type").eq("building_id", buildingId),
      ]);
      if (pRes.error) throw pRes.error;
      if (eRes.error) throw eRes.error;
      const sum = (rows: any[], ft: string) =>
        rows.filter(r => r.fund_type === ft).reduce((s, r) => s + Number(r.amount || 0), 0);
      const p = pRes.data || [];
      const e = eRes.data || [];
      return {
        chargeIncome: sum(p, "charge"),
        chargeExpense: sum(e, "charge"),
        extraIncome: sum(p, "extra_charge"),
        extraExpense: sum(e, "extra_charge"),
      };
    },
    enabled: !!buildingId,
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const chargeBalance = data.chargeIncome - data.chargeExpense;
  const extraBalance = data.extraIncome - data.extraExpense;

  const funds = [
    {
      name: "صندوق شارژ", income: data.chargeIncome, expense: data.chargeExpense,
      balance: chargeBalance, color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/30",
    },
    {
      name: "صندوق فوق شارژ", income: data.extraIncome, expense: data.extraExpense,
      balance: extraBalance, color: "text-purple-600", bg: "bg-purple-500/10", border: "border-purple-500/30",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          موجودی صندوق‌ها
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          گزارش دریافتی، هزینه و موجودی هر صندوق ساختمان
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {funds.map(f => (
          <Card key={f.name} className={`border ${f.border} ${f.bg}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-base ${f.color}`}>{f.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  دریافتی
                </span>
                <span className="font-medium text-green-700">{fmt(f.income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  هزینه
                </span>
                <span className="font-medium text-red-700">{fmt(f.expense)}</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="font-medium">موجودی</span>
                <span className={`font-bold ${f.balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {fmt(f.balance)} ریال
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-l from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="flex items-center justify-between py-4">
          <span className="font-medium">موجودی کل</span>
          <span className={`text-lg font-bold ${chargeBalance + extraBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
            {fmt(chargeBalance + extraBalance)} ریال
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
