import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Phone, KeyRound, Loader2, ShieldCheck, Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import blueTehran from "@/assets/blue-tehran.png";

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

      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (otpErr) throw otpErr;

      setMatches(data.matches);
      setIsManager(data.is_manager);
      setStep("role-select");
    } catch (err: any) {
      toast({ title: "خطا در تأیید", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBuilding = (match: UnitMatch, role: "manager" | "resident") => {
    localStorage.setItem("resident_matches", JSON.stringify([match]));
    if (role === "manager") {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/resident", { replace: true });
    }
  };

  const handleCreateBuilding = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Right side - Welcome */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-end justify-center">
        <img src={blueTehran} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 p-12 pb-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4">خوش آمدید</h1>
          <p className="text-white/80 text-lg max-w-md mx-auto leading-relaxed">
            پلتفرم هوشمند مدیریت ساختمان شارژان — مدیریت آسان، شفاف و حرفه‌ای
          </p>
        </div>
      </div>

      {/* Left side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only logo */}
          <div className="text-center space-y-2 lg:hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg">
              <Building2 className="w-9 h-9 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">خوش آمدید</h1>
            <p className="text-muted-foreground text-sm">ورود مدیران و ساکنین با شماره موبایل</p>
          </div>

          {step === "phone" && (
            <Card className="border-border/50 shadow-lg">
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
                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 shadow-glow" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    دریافت کد تأیید
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === "otp" && (
            <Card className="border-border/50 shadow-lg">
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

                <Button onClick={handleVerifyOtp} className="w-full bg-gradient-primary hover:opacity-90 shadow-glow" disabled={isLoading || otp.length !== 6}>
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
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-foreground">انتخاب ساختمان</h2>
                <p className="text-sm text-muted-foreground">ساختمان و نقش مورد نظر خود را انتخاب کنید</p>
              </div>

              <div className="grid gap-3">
                {/* Resident matches */}
                {matches.filter(m => !m.isManager).map((match, idx) => (
                  <Card
                    key={`resident-${idx}`}
                    className="cursor-pointer border-border/50 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    onClick={() => handleSelectBuilding(match, "resident")}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Home className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="font-bold text-foreground">{match.building_name}</p>
                        <p className="text-xs text-muted-foreground">
                          واحد {match.unit_number} — {match.role === "owner" ? "مالک" : "ساکن"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Manager matches */}
                {isManager && matches.filter(m => m.isManager).map((match, idx) => (
                  <Card
                    key={`manager-${idx}`}
                    className="cursor-pointer border-primary/30 hover:border-primary hover:shadow-md transition-all duration-200"
                    onClick={() => handleSelectBuilding(match, "manager")}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="font-bold text-foreground">{match.building_name}</p>
                        <p className="text-xs text-muted-foreground">مدیر ساختمان</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* If no manager-specific matches but is_manager, show generic manager entry */}
                {isManager && matches.filter(m => m.isManager).length === 0 && (
                  <Card
                    className="cursor-pointer border-primary/30 hover:border-primary hover:shadow-md transition-all duration-200"
                    onClick={() => {
                      localStorage.setItem("resident_matches", JSON.stringify(matches));
                      navigate("/dashboard", { replace: true });
                    }}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="font-bold text-foreground">پنل مدیریت</p>
                        <p className="text-xs text-muted-foreground">مدیریت کامل ساختمان‌ها</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Create new building */}
                <Card
                  className="cursor-pointer border-dashed border-2 border-border hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  onClick={handleCreateBuilding}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-foreground">ایجاد ساختمان</p>
                      <p className="text-xs text-muted-foreground">ساختمان جدید بسازید و مدیریت کنید</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button variant="ghost" className="w-full" onClick={() => { setStep("phone"); setOtp(""); setMatches([]); }}>
                ورود با شماره دیگر
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentAuth;
