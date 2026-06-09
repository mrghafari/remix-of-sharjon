import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { Loader2, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { Manager } from "@/hooks/useManagers";
import { ManagerRole } from "@/hooks/useManagerRoles";
import { toJalaliString, fromJalaliString, getTodayJalali, formatJalaliDate } from "@/lib/jalaliDate";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TransferManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ManagerRole | null;
  currentActive: Manager | null;
  candidates: Manager[];
}

export function TransferManagementDialog({
  open,
  onOpenChange,
  role,
  currentActive,
  candidates,
}: TransferManagementDialogProps) {
  const { currentBuildingId } = useBuilding();
  const qc = useQueryClient();

  const [step, setStep] = useState<"select" | "verify">("select");
  const [selectedId, setSelectedId] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(getTodayJalali());
  const [otpId, setOtpId] = useState<string>("");
  const [phoneMasked, setPhoneMasked] = useState<string>("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("select");
      setSelectedId("");
      setEffectiveDate(getTodayJalali());
      setOtpId("");
      setPhoneMasked("");
      setCode("");
    }
  }, [open]);

  const personLabel = (m: Manager) =>
    m.role_type === "external"
      ? m.external_name || "—"
      : `واحد ${m.unit?.unit_number} - ${m.role_type === "owner" ? m.unit?.owner_name : m.unit?.resident_name || m.unit?.owner_name}`;

  const handleSendOtp = async () => {
    if (!role || !selectedId || !currentBuildingId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("manager-transfer-otp", {
        body: {
          action: "init",
          building_id: currentBuildingId,
          role_id: role.id,
          new_manager_id: selectedId,
          effective_date: fromJalaliString(effectiveDate),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setOtpId((data as any).otp_id);
      setPhoneMasked((data as any).phone_masked);
      setStep("verify");
      toast.success("کد تایید به مدیر جدید ارسال شد");
    } catch (e: any) {
      toast.error(e?.message || "خطا در ارسال کد");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!otpId || !code) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("manager-transfer-otp", {
        body: { action: "verify", otp_id: otpId, code },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("انتقال مدیریت با موفقیت انجام شد");
      qc.invalidateQueries({ queryKey: ["managers"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "کد نامعتبر است");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            انتقال «{role?.label}»
          </DialogTitle>
          <DialogDescription>
            {currentActive ? (
              <>
                مدیر فعلی: <span className="font-medium">{personLabel(currentActive)}</span>
                {" — "}از {formatJalaliDate(currentActive.start_date)}
              </>
            ) : (
              "این نقش مدیر فعالی ندارد."
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>مدیر جانشین</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="یکی از مدیران ثبت‌شده را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      مدیر دیگری ثبت نشده. ابتدا مدیر جدید را اضافه کنید.
                    </div>
                  ) : (
                    candidates.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {personLabel(m)}
                        {m.role?.label ? ` • ${m.role.label}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>تاریخ مؤثر انتقال</Label>
              <JalaliDatePicker
                value={effectiveDate ? new Date(fromJalaliString(effectiveDate)) : undefined}
                onChange={(d) => setEffectiveDate(d ? toJalaliString(d) : "")}
                placeholder="انتخاب تاریخ"
              />
            </div>

            <div className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3 leading-6">
              یک کد تایید به موبایل مدیر جدید پیامک می‌شود. پس از دریافت، کد را از او گرفته و در مرحله بعد وارد کنید تا انتقال نهایی شود.
            </div>

            <Button className="w-full" disabled={!selectedId || sending} onClick={handleSendOtp}>
              {sending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              ارسال کد تایید به مدیر جدید
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="text-sm bg-muted/40 rounded-md p-3 leading-6">
              کد ۶ رقمی به شماره <span dir="ltr" className="font-mono font-bold">{phoneMasked}</span> ارسال شد. کد را از مدیر جدید بپرسید و در کادر زیر وارد کنید.
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                کد تایید
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="------"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")} disabled={verifying}>
                بازگشت
              </Button>
              <Button className="flex-1" disabled={code.length !== 6 || verifying} onClick={handleVerify}>
                {verifying && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تایید و انتقال
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
