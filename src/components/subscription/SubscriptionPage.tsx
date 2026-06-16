import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Check, Zap, Clock, ShieldCheck, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import {
  useMySubscription,
  useSubscriptionPlans,
  useMySubscriptionPayments,
  useInitSubscriptionPayment,
} from "@/hooks/useSubscription";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { toast } from "@/hooks/use-toast";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));
const DURATION_DAYS = 365;

type Mode = "buy" | "renew" | "upgrade" | "downgrade" | "blocked_free";

function describeMode(m: Mode) {
  switch (m) {
    case "buy": return { label: "خرید", icon: ShieldCheck, color: "" };
    case "renew": return { label: "تمدید", icon: RefreshCw, color: "text-blue-600" };
    case "upgrade": return { label: "ارتقاء", icon: ArrowUpRight, color: "text-emerald-600" };
    case "downgrade": return { label: "تنزل", icon: ArrowDownRight, color: "text-amber-600" };
    case "blocked_free": return { label: "غیرمجاز", icon: ArrowDownRight, color: "text-destructive" };
  }
}

export function SubscriptionPage() {
  const { data: sub, isLoading: subLoading } = useMySubscription();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans(true);
  const { data: payments } = useMySubscriptionPayments();
  const initPayment = useInitSubscriptionPayment();
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});

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

  const tierPlans = (plans ?? []).filter((p: any) => p.tier_key);
  const hasActive = !!(sub && sub.is_active && sub.subscription_id);
  const currentPlanId = hasActive ? sub!.plan_id : null;
  const currentPerUnit = hasActive
    ? Number(((plans ?? []).find((p: any) => p.id === currentPlanId) as any)?.price_per_unit_rial ?? 0)
    : 0;
  const currentQuota = hasActive ? Number(sub!.unit_quota || 0) : 0;
  const daysRemaining = hasActive ? Number(sub!.days_remaining || 0) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">اعتبار و اشتراک</h1>
          <p className="text-sm text-muted-foreground">مدیریت اشتراک، خرید، تمدید و ارتقاء پلن</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">وضعیت فعلی</CardTitle>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !hasActive ? (
            <p className="text-muted-foreground">اشتراک فعالی ندارید. لطفاً یک پلن خریداری کنید.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="پلن" value={sub!.plan_name || "—"} />
              <Stat
                label="روزهای باقی‌مانده"
                value={`${fmt(daysRemaining)} روز`}
                accent={daysRemaining <= 15 ? "danger" : "ok"}
              />
              <Stat label="واحد مصرفی" value={`${fmt(sub!.units_used)} از ${fmt(currentQuota)}`} />
              <Stat label="انقضا" value={sub!.expires_at ? formatJalaliDate(sub!.expires_at) : "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">پلن‌های موجود</h2>
        {plansLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {tierPlans.map((p: any) => {
              const perUnit = Number(p.price_per_unit_rial ?? 0);
              const isContact = Boolean(p.is_contact_only);
              const units = unitCounts[p.id] ?? Math.max(currentQuota || 0, 10);
              const total = perUnit * units;

              // Determine mode
              let mode: Mode = "buy";
              if (hasActive) {
                if (p.id === currentPlanId) mode = "renew";
                else if (perUnit > currentPerUnit) mode = "upgrade";
                else if (perUnit < currentPerUnit) mode = perUnit <= 0 ? "blocked_free" : "downgrade";
                else mode = "renew";
              }

              // Compute credit (mirrors server logic)
              let creditRial = 0;
              if (hasActive && currentPerUnit > 0 && daysRemaining > 0 && mode !== "blocked_free") {
                const rate = mode === "downgrade" ? perUnit : currentPerUnit;
                creditRial = Math.max(0, Math.round((daysRemaining / DURATION_DAYS) * rate * currentQuota));
              }
              const payable = Math.max(0, total - creditRial);

              const features: string[] = Array.isArray(p.features) ? p.features : [];
              const md = describeMode(mode);
              const Icon = md.icon;
              const isBlocked = mode === "blocked_free";
              const isCurrent = mode === "renew" && hasActive && p.id === currentPlanId;

              return (
                <Card key={p.id} className={`relative ${isCurrent ? "border-primary" : ""}`}>
                  {hasActive && !isContact && (
                    <Badge
                      className={`absolute top-2 left-2 ${isBlocked ? "bg-destructive" : ""}`}
                      variant={mode === "upgrade" ? "default" : "outline"}
                    >
                      <Icon className={`w-3 h-3 ml-1 ${md.color}`} />
                      {md.label}
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {p.name}
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </CardTitle>
                    {p.description && <CardDescription>{p.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md bg-muted/40 p-2 text-center">
                      {isContact ? (
                        <div className="text-lg font-bold">تماس بگیرید</div>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground">نرخ هر واحد (سالانه)</div>
                          <div className="text-lg font-bold">{fmt(perUnit)} <span className="text-xs font-normal">ریال</span></div>
                        </>
                      )}
                    </div>

                    <ul className="space-y-1.5 text-sm">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> {f}</li>
                      ))}
                      <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-500" /> اعتبار ۳۶۵ روز از تاریخ خرید</li>
                    </ul>

                    {!isContact && (
                      <div className="space-y-2">
                        <Label className="text-xs">تعداد واحد مورد نیاز</Label>
                        <Input
                          type="number"
                          min={1}
                          value={units}
                          disabled={isBlocked}
                          onChange={(e) =>
                            setUnitCounts((prev) => ({ ...prev, [p.id]: Math.max(1, parseInt(e.target.value || "1", 10)) }))
                          }
                        />

                        {perUnit > 0 && !isBlocked && (
                          <div className="space-y-1 text-sm border-t pt-2">
                            <Row label="قیمت پلن" value={`${fmt(total)} ریال`} />
                            {creditRial > 0 && (
                              <Row label="اعتبار باقی‌مانده فعلی" value={`- ${fmt(creditRial)} ریال`} accent="ok" />
                            )}
                            <Row
                              label="مبلغ قابل پرداخت"
                              value={`${fmt(payable)} ریال`}
                              bold
                            />
                          </div>
                        )}

                        {isBlocked && (
                          <p className="text-xs text-destructive border-t pt-2">
                            امکان تنزل از پلن فعلی به پلن رایگان وجود ندارد.
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      className="w-full"
                      disabled={initPayment.isPending || isContact || isBlocked}
                      onClick={() => initPayment.mutate({ planId: p.id, unitCount: units })}
                    >
                      {initPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        isContact ? "تماس با ما" :
                        isBlocked ? "غیرفعال" :
                        payable <= 0 ? (perUnit <= 0 ? "فعال‌سازی رایگان" : "فعال‌سازی با اعتبار") :
                        md.label}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
                    <TableCell><StatusBadge status={p.status} /></TableCell>
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

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: "ok"; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`${bold ? "font-bold" : ""} ${accent === "ok" ? "text-emerald-600" : ""}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">موفق</Badge>;
  if (status === "pending") return <Badge variant="outline">در انتظار</Badge>;
  if (status === "failed") return <Badge variant="destructive">ناموفق</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
