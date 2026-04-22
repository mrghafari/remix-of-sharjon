import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  unitId: string;
  defaultAmount: number;
  defaultFundType?: "charge" | "extra_charge";
  defaultDescription?: string;
  ownerName?: string | null;
  residentName?: string | null;
}

type Step = "form" | "gateway" | "success";

export function PaymentDialog({ open, onOpenChange, buildingId, unitId, defaultAmount, defaultFundType, defaultDescription, ownerName, residentName }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState<number>(Math.max(0, Math.round(defaultAmount)));
  const [fundType, setFundType] = useState<"charge" | "extra_charge">(defaultFundType || "charge");
  const [processing, setProcessing] = useState(false);

  // Sync form state when dialog opens with new presets
  useEffect(() => {
    if (open) {
      setStep("form");
      setAmount(Math.max(0, Math.round(defaultAmount)));
      setFundType(defaultFundType || "charge");
      setProcessing(false);
    }
  }, [open, defaultAmount, defaultFundType]);

  const reset = () => {
    setStep("form");
    setAmount(Math.max(0, Math.round(defaultAmount)));
    setFundType(defaultFundType || "charge");
    setProcessing(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setTimeout(reset, 200);
    }
    onOpenChange(next);
  };

  const handleProceed = () => {
    if (!amount || amount <= 0) {
      toast({ title: "مبلغ نامعتبر", description: "لطفاً مبلغ معتبری وارد کنید", variant: "destructive" });
      return;
    }
    setStep("gateway");
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    // Simulate gateway delay
    await new Promise((r) => setTimeout(r, 1500));

    const now = new Date();
    const { error } = await supabase.from("payments").insert({
      building_id: buildingId,
      unit_id: unitId,
      amount: Math.round(amount),
      fund_type: fundType,
      payment_date: now.toISOString().slice(0, 10),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      description: defaultDescription || "پرداخت آنلاین (شبیه‌سازی درگاه)",
      owner_name: ownerName || null,
      resident_name: residentName || null,
    });

    setProcessing(false);

    if (error) {
      toast({ title: "خطا در ثبت پرداخت", description: error.message, variant: "destructive" });
      return;
    }

    qc.invalidateQueries({ queryKey: ["resident_payments", unitId] });
    setStep("success");
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
              <DialogDescription>مبلغ و نوع صندوق را مشخص کنید</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>مبلغ پرداخت (تومان)</Label>
                <NumericInput value={String(amount || "")} onChange={(v) => setAmount(Number(v) || 0)} placeholder="مبلغ را وارد کنید" />
                <p className="text-xs text-muted-foreground">مانده حساب پیشنهادی: {Math.abs(Math.round(defaultAmount)).toLocaleString("fa-IR")} تومان</p>
              </div>
              <div className="space-y-2">
                <Label>نوع صندوق</Label>
                <RadioGroup value={fundType} onValueChange={(v) => setFundType(v as "charge" | "extra_charge")} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="charge" id="fund-charge" />
                    <Label htmlFor="fund-charge" className="cursor-pointer">شارژ</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="extra_charge" id="fund-extra" />
                    <Label htmlFor="fund-extra" className="cursor-pointer">فوق‌شارژ</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>انصراف</Button>
              <Button onClick={handleProceed}>
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
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">مبلغ:</span>
                  <span className="font-bold">{amount.toLocaleString("fa-IR")} تومان</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">نوع:</span>
                  <span>{fundType === "charge" ? "شارژ" : "فوق‌شارژ"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">پرداخت‌کننده:</span>
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
              <DialogDescription>پرداخت شما با موفقیت ثبت شد</DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center space-y-2">
              <p className="text-2xl font-bold text-emerald-600">{amount.toLocaleString("fa-IR")} تومان</p>
              <p className="text-sm text-muted-foreground">{fundType === "charge" ? "صندوق شارژ" : "صندوق فوق‌شارژ"}</p>
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
