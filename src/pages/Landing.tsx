import { Building2, Shield, BarChart3, Users, CreditCard, Bell, ArrowLeft, CheckCircle2, Sparkles, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import blueTehran from "@/assets/blue-tehran.png";

const features = [
  {
    icon: Building2,
    title: "مدیریت چند ساختمان",
    description: "هر ساختمان به صورت مجزا با واحدها، هزینه‌ها و پرداخت‌های مستقل مدیریت می‌شود.",
  },
  {
    icon: CreditCard,
    title: "مدیریت مالی هوشمند",
    description: "ثبت خودکار شارژ و فوق‌العاده، تسهیم هزینه‌ها بر اساس متراژ، تعداد ساکنین یا مساوی.",
  },
  {
    icon: BarChart3,
    title: "گزارش‌گیری جامع",
    description: "گزارش مالی هر واحد، صندوق شارژ و فوق‌العاده با قابلیت چاپ و خروجی PDF.",
  },
  {
    icon: Users,
    title: "نقش‌های کاربری",
    description: "سوپر ادمین، مدیر ساختمان و ساکن — هر کدام با سطح دسترسی مشخص.",
  },
  {
    icon: Shield,
    title: "امنیت و حریم خصوصی",
    description: "داده‌های هر ساختمان کاملاً ایزوله و دسترسی بر اساس نقش کاربری کنترل می‌شود.",
  },
  {
    icon: Bell,
    title: "اطلاع‌رسانی خودکار",
    description: "ارسال نوتیفیکیشن به ساکنین برای شارژ، تعمیرات و اعلانات مهم ساختمان.",
  },
];

const stats = [
  { value: "۹۹.۹٪", label: "آپتایم سرویس" },
  { value: "۲۵۶", label: "بیت رمزنگاری" },
  { value: "۲۴/۷", label: "پشتیبانی" },
  { value: "∞", label: "تعداد ساختمان" },
];

const pricingPlans = [
  {
    name: "رایگان",
    price: "۰",
    description: "مناسب برای یک ساختمان کوچک",
    features: ["۱ ساختمان", "حداکثر ۱۰ واحد", "گزارش‌های پایه", "پشتیبانی ایمیلی"],
    highlighted: false,
  },
  {
    name: "حرفه‌ای",
    price: "۱۴۹",
    description: "برای مدیران حرفه‌ای ساختمان",
    features: ["تا ۵ ساختمان", "واحدهای نامحدود", "گزارش‌های پیشرفته", "اطلاع‌رسانی خودکار", "پشتیبانی اولویت‌دار"],
    highlighted: true,
  },
  {
    name: "سازمانی",
    price: "تماس",
    description: "برای شرکت‌های مدیریت ساختمان",
    features: ["ساختمان‌های نامحدود", "API اختصاصی", "داشبورد مدیریتی", "SLA اختصاصی", "پشتیبانی ۲۴/۷"],
    highlighted: false,
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">شارژان</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">امکانات</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">تعرفه‌ها</a>
            <a href="#faq" className="hover:text-foreground transition-colors">سوالات متداول</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/resident-auth")}>
              ورود
            </Button>
            <Button onClick={() => navigate("/resident-auth")} className="bg-gradient-primary hover:opacity-90 shadow-glow">
              شروع رایگان
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Background image */}
        <div className="absolute inset-0 -z-10">
          <img src={blueTehran} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            پلتفرم هوشمند مدیریت ساختمان
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-tight max-w-4xl mx-auto animate-fade-in">
            مدیریت ساختمان را
            <br />
            <span className="text-gradient-primary">متحول کنید</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "100ms" }}>
            از ثبت شارژ و هزینه‌ها تا گزارش‌گیری مالی و اطلاع‌رسانی خودکار — همه چیز در یک پلتفرم ابری حرفه‌ای.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <Button size="lg" onClick={() => navigate("/resident-auth")} className="bg-gradient-primary hover:opacity-90 shadow-glow text-base px-8 h-12">
              شروع رایگان — بدون کارت بانکی
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-12">
              مشاهده دمو
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5" />
              امکانات
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">هر آنچه برای مدیریت نیاز دارید</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">ابزارهای قدرتمند برای ساده‌سازی مدیریت مالی و عملیاتی ساختمان شما</p>
          </div>
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

      {/* Pricing */}
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
            {pricingPlans.map((plan, i) => (
              <Card
                key={i}
                className={`relative overflow-hidden transition-all duration-300 ${
                  plan.highlighted
                    ? "border-primary shadow-glow scale-[1.02]"
                    : "border-border/50 hover:border-primary/30"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-primary" />
                )}
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <div className="mt-6 mb-6">
                    {plan.price === "تماس" ? (
                      <span className="text-3xl font-extrabold text-foreground">تماس بگیرید</span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">هزار تومان / ماه</span>
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
                    className={`w-full ${plan.highlighted ? "bg-gradient-primary hover:opacity-90 shadow-glow" : ""}`}
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => navigate("/resident-auth")}
                  >
                    {plan.price === "تماس" ? "تماس با ما" : "شروع کنید"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
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

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">شارژان</span>
            </div>
            <p className="text-sm text-muted-foreground">© ۱۴۰۴ شارژان — تمامی حقوق محفوظ است.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
