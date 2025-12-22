import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpLeft, TrendingUp, Loader2 } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fa-IR").format(date);
};

export function RecentPayments() {
  const { data: payments = [], isLoading } = usePayments();
  const recentPayments = payments.slice(0, 5);

  if (isLoading) {
    return (
      <Card variant="elevated" className="animate-fade-in">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="animate-fade-in opacity-0" style={{ animationDelay: "500ms" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>آخرین پرداخت‌ها</CardTitle>
          {payments.length > 0 && (
            <div className="flex items-center gap-1 text-success text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>{payments.length} پرداخت</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm">
          مشاهده همه
        </Button>
      </CardHeader>
      <CardContent>
        {recentPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>هیچ پرداختی ثبت نشده است</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentPayments.map((payment, index) => (
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
                    <p className="font-medium">
                      واحد {payment.units?.unit_number || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.description || "شارژ ماهانه"}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-success">{formatAmount(Number(payment.amount))} تومان</p>
                  <p className="text-sm text-muted-foreground">{formatDate(payment.payment_date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
