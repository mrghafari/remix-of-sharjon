import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";

export function PaymentsStats() {
  const { data: payments } = usePayments();

  const totalPayments = payments?.length || 0;
  const totalAmount = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  // Get current Persian year (approximate)
  const currentYear = 1403;
  const thisYearPayments = payments?.filter((p) => p.year === currentYear) || [];
  const thisYearAmount = thisYearPayments.reduce((sum, p) => sum + p.amount, 0);

  // Unique units that have paid
  const uniqueUnits = new Set(payments?.map((p) => p.unit_id)).size;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fa-IR").format(Math.round(amount));
  };

  const stats = [
    {
      title: "کل پرداخت‌ها",
      value: totalPayments,
      suffix: "پرداخت",
      icon: CreditCard,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "مجموع دریافتی",
      value: formatAmount(totalAmount),
      suffix: "تومان",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: `دریافتی سال ${currentYear}`,
      value: formatAmount(thisYearAmount),
      suffix: "تومان",
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "واحدهای پرداخت‌کننده",
      value: uniqueUnits,
      suffix: "واحد",
      icon: CheckCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                    <span className="text-sm font-normal text-muted-foreground mr-1">
                      {stat.suffix}
                    </span>
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
