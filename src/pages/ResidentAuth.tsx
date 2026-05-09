import { useEffect, useMemo, useRef, useState } from "react";
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

type Step = "phone" | "otp" | "select";

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

  // If user is already logged in and has stored matches, jump straight to selection
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("resident_matches_all") || "[]") as UnitMatch[];
      if (Array.isArray(all) && all.length > 0) {
        const sel = JSON.parse(localStorage.getItem("resident_matches") || "[]") as UnitMatch[];
        const currentIdx = sel[0]
          ? all.findIndex(
              (m) =>
                m.building_id === sel[0].building_id &&
                m.unit_id === sel[0].unit_id &&
                m.role === sel[0].role,
            )
          : 0;
        setMatches(all);
        setSelectedMatchIndex(currentIdx >= 0 ? currentIdx : 0);
        setStep("select");
      }
    } catch {/* ignore */}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const managerMatches = useMemo(
    () => matches.filter((match) => match.isManager),
    [matches],
  );

  const residentMatches = useMemo(
    () => matches.filter((match) => !match.isManager),
    [matches],
  );

  const toEnDigits = (s: string) =>
    s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
     .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  const normalizedPhone = toEnDigits(phone).replace(/\D/g, "");
  const isPhoneValid = normalizedPhone.length === 11 && normalizedPhone.startsWith("09");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPhoneValid) {
      toast({ title: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      let data: any = null;
      let error: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase.functions.invoke("resident-auth", {
          body: { action: "request", phone: normalizedPhone },
        });
        data = res.data;
        error = res.error;
        const isTransient = error && /503|temporarily unavailable|EDGE_RUNTIME/i.test(error.message || "");
        if (!isTransient) break;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }

      if (error) {
        const isTransient = /503|temporarily unavailable|EDGE_RUNTIME/i.test(error.message || "");
        throw new Error(isTransient ? "سرویس موقتاً در دسترس نیست. لطفاً چند لحظه بعد دوباره تلاش کنید." : error.message);
      }
      if (!data?.found) {
        toast({ title: "خطا", description: "مشکلی پیش آمد", variant: "destructive" });
        return;
      }

      setIsNewUser(false);
      setSelectedMatchIndex(0);
      setStep("otp");
      toast({ title: "کد تأیید ارسال شد", description: "کد ۶ رقمی را وارد کنید" });
    } catch (err: any) {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateForMatch = (selectedMatch: UnitMatch | undefined) => {
    if (!selectedMatch) {
      navigate("/dashboard", { replace: true });
      return;
    }
    localStorage.setItem("resident_matches", JSON.stringify([selectedMatch]));
    if (matches.length > 0) {
      localStorage.setItem("resident_matches_all", JSON.stringify(matches));
    } else {
      localStorage.setItem("resident_matches_all", JSON.stringify([selectedMatch]));
    }
    localStorage.setItem("currentBuildingId", selectedMatch.building_id);
    // Force full reload so BuildingContext and resident hooks pick up the new selection
    window.location.href = selectedMatch.isManager ? "/dashboard" : "/resident";
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;

    setIsLoading(true);
    try {
      let data: any = null;
      let error: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase.functions.invoke("resident-auth", {
          body: { action: "verify", phone: normalizedPhone, otp },
        });
        data = res.data;
        error = res.error;
        const isTransient = error && /503|temporarily unavailable|EDGE_RUNTIME/i.test(error.message || "");
        if (!isTransient) break;
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }

      if (error) {
        const isTransient = /503|temporarily unavailable|EDGE_RUNTIME/i.test(error.message || "");
        throw new Error(isTransient ? "سرویس موقتاً در دسترس نیست. لطفاً چند لحظه بعد دوباره تلاش کنید." : error.message);
      }
      if (!data?.success) {
        toast({ title: "کد اشتباه است", description: data?.message, variant: "destructive" });
        setOtp("");
        autoSubmittedRef.current = false;
        return;
      }

      const verifiedMatches: UnitMatch[] = data.matches || [];
      setMatches(verifiedMatches);
      localStorage.setItem("resident_matches_all", JSON.stringify(verifiedMatches));

      const { error: otpErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (otpErr) throw otpErr;

      if (data.is_new_user && verifiedMatches.length === 0) {
        navigate("/dashboard", { replace: true });
        return;
      }

      // If multiple roles/units, let the user choose
      if (verifiedMatches.length > 1) {
        setMatches(verifiedMatches);
        setSelectedMatchIndex(0);
        setIsNewUser(!!data.is_new_user);
        setStep("select");
        return;
      }

      navigateForMatch(verifiedMatches[0]);
    } catch (err: any) {
      toast({ title: "خطا در تأیید", description: err?.message || "کد اشتباه است", variant: "destructive" });
      setOtp("");
      autoSubmittedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBuilding = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleConfirmSelection = () => {
    navigateForMatch(matches[selectedMatchIndex]);
  };

  // Auto-submit OTP once 6 digits are entered
  const autoSubmittedRef = useRef(false);
  useEffect(() => {
    if (step !== "otp") {
      autoSubmittedRef.current = false;
      return;
    }
    if (otp.length === 6 && !isLoading && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleVerifyOtp();
    }
    if (otp.length < 6) {
      autoSubmittedRef.current = false;
    }
  }, [otp, step, isLoading]);

  return (
    <div className="min-h-screen relative" dir="rtl">
      <img src={blueTehran} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50" />

      {/* Large logo on the left, aligned to top with the auth card */}
      <div className="hidden md:flex absolute left-0 z-10 w-1/2 items-start justify-center p-8 pointer-events-none" style={{ top: "-4cm" }}>
        <img
          src={sharjanLogo}
          alt="شارژان"
          className="max-w-sm w-full h-auto drop-shadow-2xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-4 sm:p-6 space-y-3 ml-auto mr-0 sm:mr-4 mt-2">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-white">خوش آمدید</h1>
          <p className="text-white/70 text-xs">ورود یا ثبت‌نام با شماره موبایل</p>
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
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(toEnDigits(e.target.value).replace(/\D/g, "").slice(0, 11))}
                      placeholder="09123456789"
                      maxLength={11}
                      className={`pr-10 transition-colors ${
                        normalizedPhone.length === 0
                          ? ""
                          : isPhoneValid
                          ? "border-green-500 focus-visible:ring-green-500"
                          : "border-destructive focus-visible:ring-destructive"
                      }`}
                      dir="ltr"
                      required
                    />
                  </div>
                  {normalizedPhone.length > 0 && !isPhoneValid && (
                    <p className="text-xs text-destructive">
                      شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود ({normalizedPhone.length}/۱۱)
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 shadow-glow" disabled={isLoading || !isPhoneValid}>
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
                <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(toEnDigits(v).replace(/\D/g, ""))}>
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
            </form>
          </Card>
        )}

        {step === "select" && (
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>انتخاب نقش ورود</CardTitle>
              <CardDescription>برای ادامه یکی از موارد زیر را انتخاب کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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

              <Button
                type="button"
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
                onClick={handleConfirmSelection}
              >
                ورود
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const current = matches[selectedMatchIndex];
                  if (current) {
                    window.history.length > 1 ? navigate(-1) : navigate(current.isManager ? "/dashboard" : "/resident", { replace: true });
                  } else {
                    navigate("/", { replace: true });
                  }
                }}
              >
                انصراف
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResidentAuth;
