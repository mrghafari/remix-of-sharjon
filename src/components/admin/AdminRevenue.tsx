import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Wallet, Users, Calendar, Loader2 } from "lucide-react";
import { useCompanyRevenue, useAllSubscriptionPayments } from "@/hooks/useSubscription";
import { formatJalaliDate } from "@/lib/jalaliDate";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

export function AdminRevenue() {
  const { data: rev, isLoading } = useCompanyRevenue();
  const { data: payments, isLoading: payLoading } = useAllSubscriptionPayments();

  const cards = [
    { title: "کل درآمد", value: fmt(rev?.total_revenue || 0), suffix: "ریال", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "درآمد این ماه", value: fmt(rev?.this_month_revenue || 0), suffix: "ریال", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "تعداد تراکنش‌ها", value: fmt(rev?.total_payments || 0), suffix: "پرداخت", icon: Calendar, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "اشتراک‌های فعال", value: fmt(rev?.active_subscriptions || 0), suffix: "مشتری", icon: Users, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{c.title}</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? "..." : c.value}
                    <span className="text-xs font-normal text-muted-foreground mr-1">{c.suffix}</span>
                  </p>
                </div>
                <div className={`p-3 rounded-full ${c.bg}`}>
                  <c.icon className={`w-6 h-6 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>آخرین پرداخت‌های مشتریان</CardTitle></CardHeader>
        <CardContent>
          {payLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !payments?.length ? (
            <p className="text-center text-muted-foreground py-8">پرداختی ثبت نشده است</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>کاربر</TableHead>
                  <TableHead>مبلغ (ریال)</TableHead>
                  <TableHead>درگاه</TableHead>
                  <TableHead>کد پیگیری</TableHead>
                  <TableHead>وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatJalaliDate(p.payment_date || p.created_at)}</TableCell>
                    <TableCell className="ltr text-xs">{p.user_id.slice(0, 8)}…</TableCell>
                    <TableCell>{fmt(p.amount_rial)}</TableCell>
                    <TableCell>{p.gateway}</TableCell>
                    <TableCell className="ltr text-xs">{p.ref_id || p.authority || "—"}</TableCell>
                    <TableCell>
                      {p.status === "paid" ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">موفق</Badge>
                        : p.status === "pending" ? <Badge variant="outline">در انتظار</Badge>
                        : p.status === "failed" ? <Badge variant="destructive">ناموفق</Badge>
                        : <Badge variant="outline">{p.status}</Badge>}
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
