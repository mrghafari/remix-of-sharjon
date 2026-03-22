import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, KeyRound, Loader2, ShieldCheck, Home, Plus } from "lucide-react";
import sharjanLogo from "@/assets/sharjan-logo.png";
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
  const [isNewUser, setIsNewUser] = useState(false);
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
        toast({ title: "خطا", description: "مشکلی پیش آمد", variant: "destructive" });
        return;
      }
      setMatches(data.matches || []);
      setIsNewUser(!!data.is_new_user);
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

      // If new user with no matches, go directly to dashboard to create building
      if (data.is_new_user && (!data.matches || data.matches.length === 0)) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setMatches(data.matches);
      setIsManager(data.is_manager);
      setIsNewUser(!!data.is_new_user);
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
    <div className="min-h-screen relative flex items-center justify-center" dir="rtl">
      {/* Full-page background */}
      <img src={blueTehran} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md p-6 space-y-6">
        {/* Logo + Welcome */}
        <div className="text-center space-y-3">
          <img src={sharjanLogo} alt="شارژان" className="w-28 h-28 mx-auto drop-shadow-lg" />
          <h1 className="text-3xl font-extrabold text-white">خوش آمدید</h1>
          <p className="text-white/70 text-sm">ورود یا ثبت‌نام با شماره موبایل</p>
        </div>

          {step === "phone" && (
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>ورود یا ثبت‌نام</CardTitle>
                <CardDescription>شماره موبایل خود را وارد کنید</CardDescription>
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
            <div className="space-y-4">
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
                <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-4 px-6 pb-6">
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

                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 shadow-glow" disabled={isLoading || otp.length !== 6}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    تأیید و ورود
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("phone"); setOtp(""); }}>
                    تغییر شماره
                  </Button>
                </form>
              </Card>

              {/* Show matches preview below OTP */}
              {matches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-white/60 text-center">ساختمان‌های شما:</p>
                  {matches.filter(m => m.isManager).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/50">🛡️ مدیریت</p>
                      {matches.filter(m => m.isManager).map((match, idx) => (
                        <Card key={`preview-mgr-${idx}`} className="opacity-80 border-primary/20">
                          <CardContent className="p-3 flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                            <div className="text-right">
                              <p className="text-sm font-medium">{match.building_name}</p>
                              <p className="text-xs text-muted-foreground">مدیر</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  {matches.filter(m => !m.isManager).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/50">🏠 ساکن / مالک</p>
                      {matches.filter(m => !m.isManager).map((match, idx) => (
                        <Card key={`preview-res-${idx}`} className="opacity-80 border-border/30">
                          <CardContent className="p-3 flex items-center gap-3">
                            <Home className="w-5 h-5 text-accent shrink-0" />
                            <div className="text-right">
                              <p className="text-sm font-medium">{match.building_name}</p>
                              <p className="text-xs text-muted-foreground">واحد {match.unit_number} — {match.role === "owner" ? "مالک" : "ساکن"}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === "role-select" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white">انتخاب ساختمان</h2>
                <p className="text-sm text-white/70">ساختمان و نقش مورد نظر خود را انتخاب کنید</p>
              </div>

              <div className="grid gap-3">
                {/* Manager section */}
                {(() => {
                  const managerMatches = matches.filter(m => m.isManager);
                  if (managerMatches.length === 0 && !isManager) return null;
                  return (
                    <>
                      <p className="text-xs font-semibold text-white/60 mt-2">🛡️ مدیریت ساختمان</p>
                      {managerMatches.map((match, idx) => (
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
                      {isManager && managerMatches.length === 0 && (
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
                    </>
                  );
                })()}

                {/* Resident section */}
                {(() => {
                  const residentMatches = matches.filter(m => !m.isManager);
                  if (residentMatches.length === 0) return null;
                  return (
                    <>
                      <p className="text-xs font-semibold text-white/60 mt-2">🏠 ساکن / مالک</p>
                      {residentMatches.map((match, idx) => (
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
                    </>
                  );
                })()}

                {/* Create new building - separate section */}
                <p className="text-xs font-semibold text-white/60 mt-2">➕ ساختمان جدید</p>
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

              <Button variant="ghost" className="w-full text-white/70 hover:text-white" onClick={() => { setStep("phone"); setOtp(""); setMatches([]); }}>
                ورود با شماره دیگر
              </Button>
            </div>
          )}
      </div>
    </div>
  );
};

export default ResidentAuth;
