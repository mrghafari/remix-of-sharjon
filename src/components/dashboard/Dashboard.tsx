import { Building2, Users, CreditCard, AlertCircle } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { UnitsTable } from "./UnitsTable";
import { RecentPayments } from "./RecentPayments";
import { QuickActions } from "./QuickActions";

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-muted-foreground">خوش آمدید! وضعیت کلی ساختمان را مشاهده کنید.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="تعداد واحدها"
          value="۲۴"
          icon={Building2}
          iconColor="bg-primary"
          delay={100}
        />
        <StatsCard
          title="ساکنین"
          value="۸۶"
          change="+۳ نفر این ماه"
          changeType="positive"
          icon={Users}
          iconColor="bg-success"
          delay={200}
        />
        <StatsCard
          title="مجموع دریافتی"
          value="۴۵,۰۰۰,۰۰۰"
          change="تومان این ماه"
          changeType="neutral"
          icon={CreditCard}
          iconColor="bg-accent"
          delay={300}
        />
        <StatsCard
          title="بدهی معوق"
          value="۱۲,۵۰۰,۰۰۰"
          change="از ۳ واحد"
          changeType="negative"
          icon={AlertCircle}
          iconColor="bg-destructive"
          delay={400}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Units Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <UnitsTable />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Recent Payments */}
      <RecentPayments />
    </div>
  );
}
