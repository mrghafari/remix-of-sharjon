import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import type { Json } from "@/integrations/supabase/types";

const BANK_LABELS: Record<string, string> = {
  saman: "بانک سامان",
  blu_saman: "بلو (بانک سامان)",
  mellat: "بانک ملت",
  parsian: "بانک پارسیان",
  saderat: "بانک صادرات",
  pasargad: "بانک پاسارگاد",
  melli: "بانک ملی",
};
const TOP_LABELS: Record<string, string> = {
  zarinpal: "زرین‌پال",
  idpay: "آیدی‌پی",
  nextpay: "نکست‌پی",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  unitId: string;
  /** پیش‌فرض بدهی شارژ (مثبت = بدهکار) */
  chargeDebt?: number;
  /** پیش‌فرض بدهی فوق‌شارژ (مثبت = بدهکار) */
  extraDebt?: number;
  /** نقش پیش‌فرض پرداخت‌کننده برای انتخاب اولیه چک‌باکس‌ها */
  defaultRole?: "resident" | "owner";
  defaultDescription?: string;
  ownerName?: string | null;
  residentName?: string | null;
  /** شناسه ردیف‌های unit_charges از نوع شارژ که پس از پرداخت موفق باید حذف شوند */
  chargeFundIdsToClear?: string[];
  /** شناسه ردیف‌های unit_charges از نوع فوق‌شارژ که پس از پرداخت موفق باید حذف شوند */
  extraFundIdsToClear?: string[];
}

type Step = "form" | "gateway" | "success";

type PaymentRpcRecord = {
  building_id: string;
  unit_id: string;
  payment_date: string;
  month: number;
  year: number;
  amount: number;
  fund_type: "charge" | "extra_charge";
  owner_name: string | null;
  resident_name: string | null;
  description: string;
};

const r = (n: number) => Math.max(0, Math.round(n));

export function PaymentDialog({
  open,
  onOpenChange,
  buildingId,
  unitId,
  chargeDebt = 0,
  extraDebt = 0,
  defaultRole = "resident",
  defaultDescription,
  ownerName,
  residentName,
  chargeFundIdsToClear,
  extraFundIdsToClear,
}: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("form");
  const [chargeChecked, setChargeChecked] = useState(true);
  const [extraChecked, setExtraChecked] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<number>(0);
  const [extraAmount, setExtraAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>("");

  // Load enabled gateways: customer override (building manager) ← platform default
  const { data: gateways = [] } = useQuery({
    queryKey: ["enabled_gateways", buildingId],
    enabled: open && !!buildingId,
    queryFn: async () => {
      // Find building manager user_id (first manager member)
      const { data: members } = await supabase
        .from("building_members")
        .select("user_id, role")
        .eq("building_id", buildingId)
        .eq("role", "manager")
        .limit(1);
      const managerId = members?.[0]?.user_id;

      let cfg: any = null;
      if (managerId) {
        const { data: cs } = await supabase
          .from("customer_settings")
          .select("setting_value, is_enabled")
          .eq("user_id", managerId)
          .eq("setting_key", "payment_gateways")
          .maybeSingle();
        if (cs?.is_enabled && cs.setting_value) cfg = cs.setting_value;
      }
      if (!cfg) {
        const { data: ps } = await supabase
          .from("platform_settings")
          .select("setting_value")
          .eq("setting_key", "payment_gateways")
          .maybeSingle();
        cfg = ps?.setting_value || {};
      }

      const list: { key: string; label: string }[] = [];
      for (const k of ["zarinpal", "idpay", "nextpay"] as const) {
        if (cfg?.[k]?.enabled) list.push({ key: k, label: TOP_LABELS[k] });
      }
      if (cfg?.banks) {
        for (const [bk, bv] of Object.entries(cfg.banks as Record<string, any>)) {
          if (bv?.enabled) list.push({ key: `bank:${bk}`, label: BANK_LABELS[bk] || bk });
        }
      }
      return list;
    },
  });

  useEffect(() => {
    if (open) {
      setStep("form");
      setChargeAmount(r(chargeDebt));
      setExtraAmount(r(extraDebt));
      setChargeChecked(r(chargeDebt) > 0);
      setExtraChecked(r(extraDebt) > 0);
      setProcessing(false);
    }
  }, [open, chargeDebt, extraDebt, defaultRole]);

  useEffect(() => {
    if (gateways.length > 0 && !selectedGateway) {
      setSelectedGateway(gateways[0].key);
    }
  }, [gateways, selectedGateway]);

  const totalAmount =
    (chargeChecked ? r(chargeAmount) : 0) + (extraChecked ? r(extraAmount) : 0);

  const selectedGatewayLabel = useMemo(
    () => gateways.find((g) => g.key === selectedGateway)?.label || "—",
    [gateways, selectedGateway]
  );

  const handleProceed = () => {
    if (!chargeChecked && !extraChecked) {
      toast({ title: "انتخاب نوع پرداخت", description: "حداقل یکی از موارد شارژ یا فوق‌شارژ را تیک بزنید", variant: "destructive" });
      return;
    }
    if (totalAmount <= 0) {
      toast({ title: "مبلغ نامعتبر", description: "مجموع مبلغ باید بیشتر از صفر باشد", variant: "destructive" });
      return;
    }
    if (gateways.length === 0) {
      toast({ title: "درگاه فعالی موجود نیست", description: "از مدیر بخواهید درگاه پرداخت را فعال کند.", variant: "destructive" });
      return;
    }
    if (!selectedGateway) {
      toast({ title: "درگاه انتخاب نشده", description: "یک درگاه پرداخت انتخاب کنید", variant: "destructive" });
      return;
    }
    setStep("gateway");
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    await new Promise((res) => setTimeout(res, 1200));

    const now = new Date();
    const baseRecord = {
      building_id: buildingId,
      unit_id: unitId,
      payment_date: now.toISOString().slice(0, 10),
      month: Number(format(now, "M", { locale: faIR })),
      year: Number(format(now, "yyyy", { locale: faIR })),
    };

    const records: PaymentRpcRecord[] = [];
    // صندوق شارژ بر عهده ساکن است → فقط نام ساکن ثبت شود
    if (chargeChecked && r(chargeAmount) > 0) {
      records.push({
        ...baseRecord,
        amount: r(chargeAmount),
        fund_type: "charge",
        owner_name: null,
        resident_name: residentName || ownerName || null,
        description: defaultDescription || "پرداخت آنلاین صندوق شارژ (شبیه‌سازی)",
      });
    }
    // صندوق فوق‌شارژ بر عهده مالک است → فقط نام مالک ثبت شود
    if (extraChecked && r(extraAmount) > 0) {
      records.push({
        ...baseRecord,
        amount: r(extraAmount),
        fund_type: "extra_charge",
        owner_name: ownerName || residentName || null,
        resident_name: null,
        description: defaultDescription || "پرداخت آنلاین صندوق فوق‌شارژ (شبیه‌سازی)",
      });
    }

    // ردیف‌های انتخاب‌شده همیشه برای تسویه ارسال می‌شوند؛ تابع دیتابیس
    // در پرداخت کامل آن‌ها را حذف و در پرداخت جزئی مبلغ باقی‌مانده را نگه می‌دارد.
    const selectedChargeIds = chargeChecked && r(chargeAmount) > 0 ? (chargeFundIdsToClear ?? []) : [];
    const selectedExtraIds = extraChecked && r(extraAmount) > 0 ? (extraFundIdsToClear ?? []) : [];

    const { error } = await supabase.rpc("resident_pay_and_clear", {
      _building_id: buildingId,
      _unit_id: unitId,
      _payments: records as Json,
      _charge_ids_to_clear: [...selectedChargeIds, ...selectedExtraIds],
    });

    if (error) {
      setProcessing(false);
      toast({ title: "خطا در ثبت پرداخت", description: error.message, variant: "destructive" });
      return;
    }

    setProcessing(false);

    qc.invalidateQueries({ queryKey: ["resident_payments", unitId] });
    qc.invalidateQueries({ queryKey: ["resident_charges", unitId] });
    qc.invalidateQueries({ queryKey: ["resident_expense_shares", unitId] });
    setStep("success");
    // بسته شدن خودکار فرم پس از نمایش پیام موفقیت
    setTimeout(() => {
      handleClose(false);
    }, 2500);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setTimeout(() => {
        setStep("form");
        setProcessing(false);
      }, 200);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                پرداخت آنلاین بدهی
              </DialogTitle>
              <DialogDescription>
                نوع بدهی‌هایی که می‌خواهید پرداخت کنید را تیک بزنید
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* شارژ */}
              {r(chargeDebt) > 0 && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="pay-charge"
                        checked={chargeChecked}
                        onCheckedChange={(v) => setChargeChecked(!!v)}
                      />
                      <Label htmlFor="pay-charge" className="cursor-pointer font-medium">
                        صندوق شارژ
                        <span className="text-xs text-muted-foreground mr-1">(بر عهده ساکن)</span>
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      بدهی: {r(chargeDebt).toLocaleString("fa-IR")} ریال
                    </span>
                  </div>
                  {chargeChecked && (
                    <NumericInput
                      value={String(chargeAmount || "")}
                      onChange={(v) => setChargeAmount(Number(v) || 0)}
                      placeholder="مبلغ شارژ"
                    />
                  )}
                </div>
              )}

              {/* فوق‌شارژ */}
              {r(extraDebt) > 0 && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="pay-extra"
                        checked={extraChecked}
                        onCheckedChange={(v) => setExtraChecked(!!v)}
                      />
                      <Label htmlFor="pay-extra" className="cursor-pointer font-medium">
                        صندوق فوق‌شارژ
                        <span className="text-xs text-muted-foreground mr-1">(بر عهده مالک)</span>
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      بدهی: {r(extraDebt).toLocaleString("fa-IR")} ریال
                    </span>
                  </div>
                  {extraChecked && (
                    <NumericInput
                      value={String(extraAmount || "")}
                      onChange={(v) => setExtraAmount(Number(v) || 0)}
                      placeholder="مبلغ فوق‌شارژ"
                    />
                  )}
                </div>
              )}

              {/* انتخاب درگاه */}
              {gateways.length > 0 ? (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <Label className="text-sm font-medium">انتخاب درگاه پرداخت</Label>
                  <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway} className="grid grid-cols-2 gap-2">
                    {gateways.map((g) => (
                      <label
                        key={g.key}
                        htmlFor={`gw-${g.key}`}
                        className="flex items-center gap-2 border rounded-md p-2 cursor-pointer hover:bg-muted/40"
                      >
                        <RadioGroupItem value={g.key} id={`gw-${g.key}`} />
                        <span className="text-xs">{g.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
                <p className="text-xs text-destructive text-center">هیچ درگاه پرداختی فعال نیست. با مدیر تماس بگیرید.</p>
              )}

              {/* جمع کل */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">مجموع پرداخت:</span>
                <span className="text-lg font-bold text-primary">
                  {totalAmount.toLocaleString("fa-IR")} ریال
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>انصراف</Button>
              <Button onClick={handleProceed} disabled={totalAmount <= 0}>
                <CreditCard className="w-4 h-4 ml-2" />
                ادامه به درگاه
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "gateway" && (
          <>
            <DialogHeader>
              <DialogTitle>درگاه پرداخت (شبیه‌سازی)</DialogTitle>
              <DialogDescription>این صفحه جایگزین درگاه واقعی است</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                {chargeChecked && r(chargeAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">صندوق شارژ:</span>
                    <span className="font-semibold">{r(chargeAmount).toLocaleString("fa-IR")} ریال</span>
                  </div>
                )}
                {extraChecked && r(extraAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">صندوق فوق‌شارژ:</span>
                    <span className="font-semibold">{r(extraAmount).toLocaleString("fa-IR")} ریال</span>
                  </div>
                )}
                <div className="flex justify-between text-base pt-2 border-t">
                  <span className="font-medium">مجموع:</span>
                  <span className="font-bold text-primary">{totalAmount.toLocaleString("fa-IR")} ریال</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>پرداخت‌کننده:</span>
                  <span>{residentName || ownerName || "—"}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                در محیط واقعی به درگاه بانک هدایت می‌شوید. اینجا برای تست، روی «تأیید پرداخت» کلیک کنید.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("form")} disabled={processing}>بازگشت</Button>
              <Button onClick={handleConfirmPayment} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
                تأیید پرداخت
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                پرداخت موفق
              </DialogTitle>
              <DialogDescription>پرداخت شما با موفقیت ثبت شد و به صندوق‌های مربوطه واریز شد</DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center space-y-2">
              <p className="text-2xl font-bold text-emerald-600">{totalAmount.toLocaleString("fa-IR")} ریال</p>
              <div className="text-sm text-muted-foreground space-y-1">
                {chargeChecked && r(chargeAmount) > 0 && (
                  <p>✓ {r(chargeAmount).toLocaleString("fa-IR")} ریال به صندوق شارژ</p>
                )}
                {extraChecked && r(extraAmount) > 0 && (
                  <p>✓ {r(extraAmount).toLocaleString("fa-IR")} ریال به صندوق فوق‌شارژ</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)} className="w-full">بستن</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
