import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import type { Json } from "@/integrations/supabase/types";

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

  useEffect(() => {
    if (open) {
      setStep("form");
      setChargeAmount(r(chargeDebt));
      setExtraAmount(r(extraDebt));
      // پیش‌فرض: هر دو نوع پرداخت در صورت وجود بدهی فعال باشند
      setChargeChecked(r(chargeDebt) > 0);
      setExtraChecked(r(extraDebt) > 0);
      setProcessing(false);
    }
  }, [open, chargeDebt, extraDebt, defaultRole]);

  const totalAmount =
    (chargeChecked ? r(chargeAmount) : 0) + (extraChecked ? r(extraAmount) : 0);

  const handleProceed = () => {
    if (!chargeChecked && !extraChecked) {
      toast({ title: "انتخاب نوع پرداخت", description: "حداقل یکی از موارد شارژ یا فوق‌شارژ را تیک بزنید", variant: "destructive" });
      return;
    }
    if (totalAmount <= 0) {
      toast({ title: "مبلغ نامعتبر", description: "مجموع مبلغ باید بیشتر از صفر باشد", variant: "destructive" });
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
                      بدهی: {r(chargeDebt).toLocaleString("fa-IR")} تومان
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
                      بدهی: {r(extraDebt).toLocaleString("fa-IR")} تومان
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

              {/* جمع کل */}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">مجموع پرداخت:</span>
                <span className="text-lg font-bold text-primary">
                  {totalAmount.toLocaleString("fa-IR")} تومان
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
                    <span className="font-semibold">{r(chargeAmount).toLocaleString("fa-IR")} تومان</span>
                  </div>
                )}
                {extraChecked && r(extraAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">صندوق فوق‌شارژ:</span>
                    <span className="font-semibold">{r(extraAmount).toLocaleString("fa-IR")} تومان</span>
                  </div>
                )}
                <div className="flex justify-between text-base pt-2 border-t">
                  <span className="font-medium">مجموع:</span>
                  <span className="font-bold text-primary">{totalAmount.toLocaleString("fa-IR")} تومان</span>
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
              <p className="text-2xl font-bold text-emerald-600">{totalAmount.toLocaleString("fa-IR")} تومان</p>
              <div className="text-sm text-muted-foreground space-y-1">
                {chargeChecked && r(chargeAmount) > 0 && (
                  <p>✓ {r(chargeAmount).toLocaleString("fa-IR")} تومان به صندوق شارژ</p>
                )}
                {extraChecked && r(extraAmount) > 0 && (
                  <p>✓ {r(extraAmount).toLocaleString("fa-IR")} تومان به صندوق فوق‌شارژ</p>
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
