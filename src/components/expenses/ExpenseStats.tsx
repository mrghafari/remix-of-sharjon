import { Card, CardContent } from "@/components/ui/card";
import { categories, ExpenseData } from "./ExpenseForm";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ExpenseStatsProps {
  expenses: ExpenseData[];
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

export function ExpenseStats({ expenses }: ExpenseStatsProps) {
  // Calculate totals by category
  const categoryTotals = categories.map((cat) => {
    const total = expenses
      .filter((exp) => exp.category === cat.id)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return { ...cat, total };
  }).filter((cat) => cat.total > 0);

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const thisMonth = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    const now = new Date();
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((sum, exp) => sum + exp.amount, 0);

  // Get top 3 categories
  const topCategories = [...categoryTotals].sort((a, b) => b.total - a.total).slice(0, 3);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
      {/* Total Expenses */}
      <Card variant="stats">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">مجموع هزینه‌ها</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(totalAmount)}</p>
              <p className="text-xs text-muted-foreground">تومان</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card variant="stats">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">هزینه این ماه</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(thisMonthTotal)}</p>
              <p className="text-xs text-muted-foreground">{thisMonth.length} مورد</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Minus className="w-5 h-5 text-accent-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Category */}
      {topCategories[0] && (
        <Card variant="stats">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">بیشترین هزینه</p>
                <p className="text-lg font-bold mt-1">{topCategories[0].label}</p>
                <p className="text-sm text-muted-foreground">{formatAmount(topCategories[0].total)} تومان</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-warning flex items-center justify-center text-xl">
                {topCategories[0].icon}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Count */}
      <Card variant="stats">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">تعداد هزینه‌ها</p>
              <p className="text-2xl font-bold mt-1">{expenses.length}</p>
              <p className="text-xs text-muted-foreground">مورد ثبت شده</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-success flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-success-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
