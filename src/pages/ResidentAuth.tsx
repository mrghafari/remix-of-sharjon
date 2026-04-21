import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, KeyRound, Loader2, ShieldCheck, Home, Plus, CheckCircle2 } from "lucide-react";
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
  unit_id: string | null;
  unit_number: string | null;
  building_id: string;
  building_name: string;
  owner_name: string;
  resident_name: string | null;
  role: "owner" | "resident" | "manager";
  isManager: boolean;
}

type Step = "phone" | "otp";

const ResidentAuth = () => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [matches, setMatches] = useState<UnitMatch[]>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const managerMatches = useMemo(
    () => matches.filter((match) => match.isManager),
    [matches],
  );

  const residentMatches = useMemo(
    () => matches.filter((match) => !match.isManager),
    [matches],
  );

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

      const verifiedMatches: UnitMatch[] = data.matches || [];

      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (otpErr) throw otpErr;

      if (data.is_new_user && verifiedMatches.length === 0) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const selectedMatch = verifiedMatches[selectedMatchIndex] || verifiedMatches[0];

      if (!selectedMatch) {
        navigate("/dashboard", { replace: true });
        return;
      }

      localStorage.setItem("resident_matches", JSON.stringify([selectedMatch]));
      localStorage.setItem("currentBuildingId", selectedMatch.building_id);

      if (selectedMatch.isManager) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/resident", { replace: true });
    } catch (err: any) {
      toast({ title: "خطا در تأیید", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBuilding = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center" dir="rtl">
      <img src={blueTehran} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-xl p-6 space-y-6">
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
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/")}>
                  انصراف
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
                <CardDescription>کد ارسال‌شده به {phone} را وارد کنید</CardDescription>
              </CardHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }} className="space-y-4 px-6 pb-6">
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

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setMatches([]);
                    setSelectedMatchIndex(0);
                  }}>
                    تغییر شماره
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/")}>
                    انصراف
                  </Button>
                </div>

                {(matches.length > 0 || isNewUser) && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    {matches.length > 0 && (
                      <>
                        <p className="text-sm font-semibold text-center text-muted-foreground">
                          وارد کدام ساختمان شوید؟
                        </p>

                        {managerMatches.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">🛡️ مدیریت</p>
                            {managerMatches.map((match) => {
                              const matchIndex = matches.findIndex(
                                (item) => item.building_id === match.building_id && item.unit_id === match.unit_id && item.role === match.role,
                              );
                              const isSelected = selectedMatchIndex === matchIndex;
                              return (
                                <div
                                  key={`mgr-${match.building_id}-${match.unit_id ?? "manager"}`}
                                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? "bg-primary/10 ring-1 ring-primary/40" : "bg-muted/50 hover:bg-muted"}`}
                                  onClick={() => setSelectedMatchIndex(matchIndex)}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1 text-right">
                                    <p className="text-sm font-bold">{match.building_name}</p>
                                    <p className="text-xs text-muted-foreground">مدیر ساختمان</p>
                                  </div>
                                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {residentMatches.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">🏠 ساکن / مالک</p>
                            {residentMatches.map((match) => {
                              const matchIndex = matches.findIndex(
                                (item) => item.building_id === match.building_id && item.unit_id === match.unit_id && item.role === match.role,
                              );
                              const isSelected = selectedMatchIndex === matchIndex;
                              return (
                                <div
                                  key={`res-${match.building_id}-${match.unit_id}`}
                                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${isSelected ? "bg-primary/10 ring-1 ring-primary/40" : "bg-muted/50 hover:bg-muted"}`}
                                  onClick={() => setSelectedMatchIndex(matchIndex)}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                                    <Home className="w-4 h-4 text-accent" />
                                  </div>
                                  <div className="flex-1 text-right">
                                    <p className="text-sm font-bold">{match.building_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      واحد {match.unit_number} — {match.role === "owner" ? "مالک" : "ساکن"}
                                    </p>
                                  </div>
                                  {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {!isNewUser && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">➕ ساختمان جدید</p>
                        <div
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-all duration-200"
                          onClick={handleCreateBuilding}
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-sm font-bold">ایجاد ساختمان</p>
                            <p className="text-xs text-muted-foreground">ساختمان جدید بسازید</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentAuth;
