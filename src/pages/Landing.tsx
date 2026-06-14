import { Building2, Shield, BarChart3, Users, CreditCard, Bell, ArrowLeft, CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin } from "@/hooks/useAdmin";
import blueTehran from "@/assets/blue-tehran.png";
import sharjanLogo from "@/assets/sharjan-logo.png";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

interface LandingPlan {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  price_per_unit_rial: number;
  is_contact_only: boolean;
  tier_key: string | null;
  sort_order: number;
}

const features = [
  { icon: Building2, title: "مدیریت چند ساختمان", description: "هر ساختمان به صورت مجزا با واحدها، هزینه‌ها و پرداخت‌های مستقل مدیریت می‌شود." },
  { icon: CreditCard, title: "مدیریت مالی هوشمند", description: "ثبت خودکار شارژ و فوق‌العاده، تسهیم هزینه‌ها بر اساس متراژ، تعداد ساکنین یا مساوی." },
  { icon: BarChart3, title: "گزارش‌گیری جامع", description: "گزارش مالی هر واحد، صندوق شارژ و فوق‌العاده با قابلیت چاپ و خروجی PDF." },
  { icon: Users, title: "نقش‌های کاربری", description: "سوپر ادمین، مدیر ساختمان و ساکن — هر کدام با سطح دسترسی مشخص." },
  { icon: Shield, title: "امنیت و حریم خصوصی", description: "داده‌های هر ساختمان کاملاً ایزوله و دسترسی بر اساس نقش کاربری کنترل می‌شود." },
  { icon: Bell, title: "اطلاع‌رسانی خودکار", description: "ارسال نوتیفیکیشن به ساکنین برای شارژ، تعمیرات و اعلانات مهم ساختمان." },
];


export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: isSuperAdmin } = useIsSuperAdmin(user?.id);
  const [pricingPlans, setPricingPlans] = useState<LandingPlan[]>([]);

  useEffect(() => {
    if (loading || !user) return;
    if (isSuperAdmin) { navigate("/admin", { replace: true }); return; }
    const hasResident = !!localStorage.getItem("resident_matches");
    if (hasResident) { navigate("/resident", { replace: true }); return; }
    navigate("/dashboard", { replace: true });
  }, [user, loading, isSuperAdmin, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id,name,description,features,price_per_unit_rial,is_contact_only,tier_key,sort_order")
        .eq("is_active", true)
        .not("tier_key", "is", null)
        .order("sort_order", { ascending: true });
      if (Array.isArray(data)) {
        setPricingPlans(data.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          features: Array.isArray(d.features) ? d.features : [],
          price_per_unit_rial: Number(d.price_per_unit_rial ?? 0),
          is_contact_only: Boolean(d.is_contact_only),
          tier_key: d.tier_key,
          sort_order: d.sort_order,
        })));
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={sharjanLogo} alt="شارژان" className="w-16 h-16 object-contain" />
            <span className="text-xl font-bold text-foreground">شارژان</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">امکانات</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">تعرفه‌ها</a>
            <a href="#faq" className="hover:text-foreground transition-colors">سوالات متداول</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/resident-auth")}>ورود</Button>
            <Button onClick={() => navigate("/resident-auth")} className="bg-gradient-primary hover:opacity-90 shadow-glow">
              دمو
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pt-12 pb-12">
        <div className="absolute inset-0 -z-10">
          <img src={blueTehran} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
        </div>
      </section>

      <section id="features" className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Card key={i} className="card-hover border-border/50 bg-card">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Globe className="w-3.5 h-3.5" />
              تعرفه‌ها
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">پلنی متناسب با نیاز شما</h2>
            <p className="mt-3 text-muted-foreground">با پلن رایگان شروع کنید و هر زمان خواستید ارتقا دهید</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => {
              const highlighted = plan.tier_key === "pro";
              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    highlighted ? "border-primary shadow-glow scale-[1.02]" : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  {highlighted && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-primary" />}
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                    <div className="mt-6 mb-6">
                      {plan.is_contact_only ? (
                        <span className="text-3xl font-extrabold text-foreground">تماس بگیرید</span>
                      ) : plan.price_per_unit_rial === 0 ? (
                        <span className="text-3xl font-extrabold text-foreground">رایگان</span>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-foreground">{fmt(plan.price_per_unit_rial)}</span>
                          <span className="text-muted-foreground text-sm">ریال / واحد / سال</span>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${highlighted ? "bg-gradient-primary hover:opacity-90 shadow-glow" : ""}`}
                      variant={highlighted ? "default" : "outline"}
                      onClick={() => navigate("/resident-auth")}
                    >
                      {plan.is_contact_only ? "تماس با ما" : "شروع کنید"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="rounded-3xl bg-gradient-primary p-12 md:p-16 shadow-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground mb-4">
                آماده‌اید مدیریت ساختمان را حرفه‌ای کنید؟
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                همین الان ثبت‌نام کنید و مدیریت ساختمان خود را به سطح بالاتری ببرید.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/resident-auth")}
                className="bg-white text-primary hover:bg-white/90 text-base px-8 h-12 font-bold shadow-lg"
              >
                ثبت‌نام رایگان
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={sharjanLogo} alt="شارژان" className="w-8 h-8" />
              <span className="font-bold text-foreground">شارژان</span>
            </div>
            <p className="text-sm text-muted-foreground">© ۱۴۰۴ شارژان — تمامی حقوق محفوظ است.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
