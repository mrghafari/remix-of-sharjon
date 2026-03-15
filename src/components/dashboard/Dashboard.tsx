import { Building2, Users, CreditCard, AlertCircle } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { UnitsTable } from "./UnitsTable";
import { RecentPayments } from "./RecentPayments";
import { QuickActions } from "./QuickActions";
import { FundBalance } from "./FundBalance";
import { useUnits } from "@/hooks/useUnits";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";
import { useBackfillExpenseShares } from "@/hooks/useBackfillExpenseShares";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(Math.round(amount));
};

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

export function Dashboard({ onTabChange }: DashboardProps) {
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  
  // Auto-backfill expense shares for existing expenses
  useBackfillExpenseShares();

  const isLoading = unitsLoading || expensesLoading || paymentsLoading;
  
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const occupiedUnits = units.filter(u => u.is_occupied).length;

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
          value={isLoading ? "-" : units.length.toString()}
          icon={Building2}
          iconColor="bg-primary"
          delay={100}
        />
        <StatsCard
          title="واحدهای سکونت"
          value={isLoading ? "-" : occupiedUnits.toString()}
          change={`از ${units.length} واحد`}
          changeType="neutral"
          icon={Users}
          iconColor="bg-success"
          delay={200}
        />
        <StatsCard
          title="مجموع دریافتی"
          value={isLoading ? "-" : formatAmount(totalPayments)}
          change="تومان"
          changeType="positive"
          icon={CreditCard}
          iconColor="bg-accent"
          delay={300}
        />
        <StatsCard
          title="مجموع هزینه‌ها"
          value={isLoading ? "-" : formatAmount(totalExpenses)}
          change="تومان"
          changeType="negative"
          icon={AlertCircle}
          iconColor="bg-destructive"
          delay={400}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Units Table - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <UnitsTable />
          <RecentPayments />
        </div>

        {/* Right Side - Quick Actions + Fund Balance */}
        <div className="space-y-6">
          <QuickActions onTabChange={onTabChange || (() => {})} />
          <FundBalance />
        </div>
      </div>
    </div>
  );
}
