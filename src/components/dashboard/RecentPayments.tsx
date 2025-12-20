import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpLeft, TrendingUp } from "lucide-react";

const payments = [
  { id: 1, unit: "۱۰۱", amount: "۲,۵۰۰,۰۰۰", date: "۱۴۰۳/۰۹/۱۵", type: "شارژ ماهانه" },
  { id: 2, unit: "۳۰۱", amount: "۲,۵۰۰,۰۰۰", date: "۱۴۰۳/۰۹/۱۴", type: "شارژ ماهانه" },
  { id: 3, unit: "۲۰۱", amount: "۵,۰۰۰,۰۰۰", date: "۱۴۰۳/۰۹/۱۳", type: "صندوق" },
  { id: 4, unit: "۱۰۲", amount: "۱,۲۰۰,۰۰۰", date: "۱۴۰۳/۰۹/۱۲", type: "تعمیرات" },
];

export function RecentPayments() {
  return (
    <Card variant="elevated" className="animate-fade-in opacity-0" style={{ animationDelay: "500ms" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>آخرین پرداخت‌ها</CardTitle>
          <div className="flex items-center gap-1 text-success text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>+۱۲٪</span>
          </div>
        </div>
        <Button variant="outline" size="sm">
          مشاهده همه
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment, index) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              style={{ animationDelay: `${600 + index * 100}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <ArrowUpLeft className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium">واحد {payment.unit}</p>
                  <p className="text-sm text-muted-foreground">{payment.type}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-success">{payment.amount} تومان</p>
                <p className="text-sm text-muted-foreground">{payment.date}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
