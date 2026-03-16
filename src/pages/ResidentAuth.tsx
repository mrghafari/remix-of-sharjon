import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Phone, KeyRound, Loader2, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UnitMatch {
  unit_id: string;
  unit_number: string;
  building_id: string;
  building_name: string;
  owner_name: string;
  resident_name: string | null;
  role: "owner" | "resident";
  isManager: boolean;
}

type Step = "phone" | "otp" | "role-select";

const ResidentAuth = () => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [matches, setMatches] = useState<UnitMatch[]>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || phone.trim().length < 10) {
      toast({ title: "لطفاً شماره موبایل معتبر وارد کنید", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resident-auth", {
        body: { action: "request", phone: phone.trim() },
      });
      if (error) throw error;
      if (!data.found) {
        toast({ title: "شماره یافت نشد", description: data.message, variant: "destructive" });
        return;
      }
      setMatches(data.matches);
      setSelectedMatchIndex(0);
      setStep("otp");
      toast({ title: "کد تأیید ارسال شد", description: "کد ۱۲۳۴۵۶ را وارد کنید (حالت تست)" });
    } catch (err: any) {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resident-auth", {
        body: { action: "verify", phone: phone.trim(), otp },
      });
      if (error) throw error;
      if (!data.success) {
        toast({ title: "کد اشتباه است", variant: "destructive" });
        return;
      }

      // Exchange token_hash for session
      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (otpErr) throw otpErr;

      setMatches(data.matches);
      setIsManager(data.is_manager);

      if (data.is_manager) {
        setStep("role-select");
      } else {
      // Store only the selected match and navigate
        const selected = [data.matches[selectedMatchIndex] || data.matches[0]];
        localStorage.setItem("resident_matches", JSON.stringify(selected));
        navigate("/resident", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "خطا در تأیید", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: "manager" | "resident") => {
    const selected = [matches[selectedMatchIndex] || matches[0]];
    localStorage.setItem("resident_matches", JSON.stringify(selected));
    if (role === "manager") {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/resident", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg">
            <Building2 className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">پنل ساکنین</h1>
          <p className="text-muted-foreground text-sm">مشاهده وضعیت مالی و اطلاعات ساختمان</p>
        </div>

        {step === "phone" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>ورود با شماره موبایل</CardTitle>
              <CardDescription>شماره موبایلی که در ساختمان ثبت شده را وارد کنید</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">شماره موبایل</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09123456789"
                      className="pr-10"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  دریافت کد تأیید
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => navigate("/auth")} className="text-sm text-primary hover:underline">
                  ورود مدیران (ایمیل و رمز عبور)
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "otp" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <KeyRound className="w-5 h-5" />
                کد تأیید
              </CardTitle>
              <CardDescription>
                کد ارسال‌شده به {phone} را وارد کنید
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center" dir="ltr">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {matches.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">واحد مورد نظر را انتخاب کنید:</p>
                  {matches.map((m, idx) => (
                    <label
                      key={m.unit_id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedMatchIndex === idx ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="selected-unit"
                        checked={selectedMatchIndex === idx}
                        onChange={() => setSelectedMatchIndex(idx)}
                        className="accent-[hsl(var(--primary))]"
                      />
                      <span className="text-sm">
                        🏢 {m.building_name} - واحد {m.unit_number} ({m.role === "owner" ? "مالک" : "ساکن"})
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <Button onClick={handleVerifyOtp} className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تأیید و ورود
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setStep("phone"); setOtp(""); }}>
                تغییر شماره
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "role-select" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>انتخاب نقش ورود</CardTitle>
              <CardDescription>
                شماره شما به عنوان مدیر ساختمان نیز ثبت شده است. لطفاً نحوه ورود را انتخاب کنید.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex items-center gap-4 justify-start"
                onClick={() => handleRoleSelect("manager")}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="text-right">
                  <p className="font-semibold">پنل مدیریت</p>
                  <p className="text-xs text-muted-foreground">مدیریت کامل ساختمان، هزینه‌ها و واحدها</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex items-center gap-4 justify-start"
                onClick={() => handleRoleSelect("resident")}
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="text-right">
                  <p className="font-semibold">پنل ساکن</p>
                  <p className="text-xs text-muted-foreground">مشاهده وضعیت مالی واحد و اطلاعات ساختمان</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResidentAuth;
