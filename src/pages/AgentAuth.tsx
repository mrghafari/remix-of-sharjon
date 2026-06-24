import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, KeyRound, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";

type Step = "phone" | "otp" | "signup" | "status";

export default function AgentAuth() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [city, setCity] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const callAuth = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("agent-auth", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const requestOtp = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "شماره موبایل معتبر نیست", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await callAuth({ action: "request", phone });
      setStep("otp");
      toast({ title: "کد تأیید ارسال شد", description: "کد آزمایشی: 123456" });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (signupData?: any) => {
    setLoading(true);
    try {
      const result = await callAuth({
        action: "verify",
        phone,
        otp,
        ...(signupData || {}),
      });

      if (result?.needs_signup) {
        setStep("signup");
        setLoading(false);
        return;
      }

      if (result?.token_hash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "magiclink",
        });
        if (error) throw error;

        if (result.status === "approved") {
          toast({ title: "ورود موفق", description: `خوش آمدید ${result.full_name}` });
          navigate("/agent");
        } else {
          setStatus(result.status);
          setStep("status");
        }
      }
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = () => {
    if (!fullName) {
      toast({ title: "نام و نام خانوادگی الزامی است", variant: "destructive" });
      return;
    }
    verifyOtp({
      full_name: fullName,
      agency_name: agencyName,
      city,
      national_code: nationalCode,
      license_number: licenseNumber,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">پورتال مشاورین املاک</CardTitle>
          <CardDescription>
            {step === "phone" && "ورود/ثبت‌نام با شماره موبایل"}
            {step === "otp" && "کد تأیید ارسالی را وارد کنید"}
            {step === "signup" && "تکمیل اطلاعات ثبت‌نام"}
            {step === "status" && "وضعیت حساب کاربری"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "phone" && (
            <>
              <div className="space-y-2">
                <Label>شماره موبایل</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    dir="ltr"
                    placeholder="09123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-10 text-left"
                    onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                  />
                </div>
              </div>
              <Button onClick={requestOtp} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "دریافت کد تأیید"}
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="space-y-2">
                <Label>کد ۶ رقمی</Label>
                <div className="flex justify-center">
                  <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                    <InputOTPGroup dir="ltr">
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-muted-foreground">کد آزمایشی: 123456</p>
              </div>
              <Button onClick={() => verifyOtp()} className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4 ml-2" />تأیید</>}
              </Button>
              <Button variant="ghost" onClick={() => setStep("phone")} className="w-full">تغییر شماره</Button>
            </>
          )}

          {step === "signup" && (
            <>
              <div className="space-y-2">
                <Label>نام و نام خانوادگی *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="نام کامل" />
              </div>
              <div className="space-y-2">
                <Label>نام آژانس</Label>
                <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="مثلاً: املاک پارس" />
              </div>
              <div className="space-y-2">
                <Label>شهر فعالیت</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثلاً: تهران" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>کد ملی</Label>
                  <Input value={nationalCode} onChange={(e) => setNationalCode(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>شماره پروانه</Label>
                  <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} dir="ltr" />
                </div>
              </div>
              <Button onClick={submitSignup} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ثبت‌نام"}
              </Button>
            </>
          )}

          {step === "status" && (
            <div className="text-center space-y-4 py-6">
              {status === "pending" && (
                <>
                  <Clock className="w-16 h-16 mx-auto text-amber-500" />
                  <h3 className="text-xl font-semibold">در انتظار تأیید</h3>
                  <p className="text-muted-foreground">
                    حساب شما در حال بررسی توسط مدیران سامانه است. پس از تأیید با همین شماره می‌توانید وارد شوید.
                  </p>
                </>
              )}
              {status === "rejected" && (
                <>
                  <XCircle className="w-16 h-16 mx-auto text-destructive" />
                  <h3 className="text-xl font-semibold">حساب رد شده</h3>
                  <p className="text-muted-foreground">
                    متاسفانه ثبت‌نام شما تأیید نشد. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.
                  </p>
                </>
              )}
              <Button variant="outline" onClick={() => { supabase.auth.signOut(); setStep("phone"); setPhone(""); setOtp(""); }} className="w-full">
                بازگشت
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
