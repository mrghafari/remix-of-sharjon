import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Check, Zap, Clock, ShieldCheck } from "lucide-react";
import {
  useMySubscription,
  useSubscriptionPlans,
  useMySubscriptionPayments,
  useInitSubscriptionPayment,
} from "@/hooks/useSubscription";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { toast } from "@/hooks/use-toast";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

export function SubscriptionPage() {
  const { data: sub, isLoading: subLoading } = useMySubscription();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans(true);
  const { data: payments } = useMySubscriptionPayments();
  const initPayment = useInitSubscriptionPayment();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const st = params.get("payment");
    if (st === "ok") toast({ title: "پرداخت موفق", description: "اشتراک شما فعال شد" });
    else if (st === "failed") toast({ title: "پرداخت ناموفق", variant: "destructive" });
    if (st) {
      params.delete("payment");
      params.delete("authority");
      const url = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", url);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">اعتبار و اشتراک</h1>
          <p className="text-sm text-muted-foreground">مدیریت اشتراک، خرید و تمدید اعتبار</p>
        </div>
      </div>

      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">وضعیت فعلی</CardTitle>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !sub || !sub.subscription_id ? (
            <p className="text-muted-foreground">اشتراک فعالی ندارید. لطفاً یک پلن خریداری کنید.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="پلن" value={sub.plan_name || "—"} />
              <Stat
                label="روزهای باقی‌مانده"
                value={`${fmt(sub.days_remaining)} روز`}
                accent={sub.days_remaining <= 15 ? "danger" : "ok"}
              />
              <Stat label="واحد مصرفی" value={`${fmt(sub.units_used)} از ${fmt(sub.unit_quota || 0)}`} />
              <Stat label="انقضا" value={sub.expires_at ? formatJalaliDate(sub.expires_at) : "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-3">پلن‌های موجود</h2>
        {plansLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {plans?.map((p) => (
              <Card key={p.id} className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {p.name}
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </CardTitle>
                  {p.description && <CardDescription>{p.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold">
                    {fmt(p.price_rial)} <span className="text-xs font-normal text-muted-foreground">ریال</span>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> {fmt(p.unit_quota)} واحد قابل مدیریت</li>
                    <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /> اعتبار {fmt(p.duration_days)} روز</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> پشتیبانی فنی</li>
                  </ul>
                  <Button
                    className="w-full"
                    disabled={initPayment.isPending}
                    onClick={() => initPayment.mutate(p.id)}
                  >
                    {initPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "خرید / تمدید"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">تاریخچه پرداخت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {!payments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">پرداختی ثبت نشده است</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
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
                    <TableCell>{fmt(p.amount_rial)}</TableCell>
                    <TableCell>{p.gateway}</TableCell>
                    <TableCell className="ltr text-xs">{p.ref_id || p.authority || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: "ok" | "danger" }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-bold mt-1 ${accent === "danger" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">موفق</Badge>;
  if (status === "pending") return <Badge variant="outline">در انتظار</Badge>;
  if (status === "failed") return <Badge variant="destructive">ناموفق</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
