import { useState } from "react";
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type View = "login" | "forgot";

const Auth = () => {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "خطا در ورود",
          description: error.message === "Invalid login credentials"
            ? "ایمیل یا رمز عبور اشتباه است"
            : error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "لطفاً ایمیل خود را وارد کنید", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "ایمیل بازیابی ارسال شد",
        description: "لطفاً ایمیل خود را بررسی کنید و روی لینک بازیابی کلیک کنید.",
      });
      setView("login");
    } catch (err: any) {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
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
          <h1 className="text-2xl font-bold text-foreground">پنل ادمین سایت</h1>
          <p className="text-muted-foreground text-sm">ورود مخصوص مدیر کل سامانه</p>
        </div>

        {view === "login" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>ورود به حساب</CardTitle>
              <CardDescription>با ایمیل و رمز عبور وارد شوید</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">ایمیل</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pr-10"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور خود را وارد کنید"
                      className="pr-10 pl-10"
                      dir="ltr"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "لطفاً صبر کنید..." : "ورود"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setView("forgot")}
                  className="text-sm text-primary hover:underline"
                >
                  رمز عبور خود را فراموش کرده‌اید؟
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {view === "forgot" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>بازیابی رمز عبور</CardTitle>
              <CardDescription>ایمیل حساب خود را وارد کنید تا لینک بازیابی ارسال شود</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">ایمیل</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pr-10"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "لطفاً صبر کنید..." : "ارسال لینک بازیابی"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setView("login")}
                  className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowRight className="w-3 h-3" />
                  بازگشت به ورود
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
