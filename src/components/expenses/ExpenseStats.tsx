import { Card, CardContent } from "@/components/ui/card";
import { categories } from "./ExpenseForm";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(Math.round(amount));
};

export function ExpenseStats() {
  const { data: expenses = [], isLoading } = useExpenses();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="stats">
            <CardContent className="p-5 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate totals by category
  const categoryTotals = categories.map((cat) => {
    const total = expenses
      .filter((exp) => exp.category === cat.id)
      .reduce((sum, exp) => sum + Number(exp.amount), 0);
    return { ...cat, total };
  }).filter((cat) => cat.total > 0);

  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const thisMonth = expenses.filter((exp) => {
    const expDate = new Date(exp.expense_date);
    const now = new Date();
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // Get top category
  const topCategory = [...categoryTotals].sort((a, b) => b.total - a.total)[0];

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
      {topCategory ? (
        <Card variant="stats">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">بیشترین هزینه</p>
                <p className="text-lg font-bold mt-1">{topCategory.label}</p>
                <p className="text-sm text-muted-foreground">{formatAmount(topCategory.total)} تومان</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-warning flex items-center justify-center text-xl">
                {topCategory.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card variant="stats">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">بیشترین هزینه</p>
                <p className="text-lg font-bold mt-1">-</p>
                <p className="text-sm text-muted-foreground">هنوز هزینه‌ای ثبت نشده</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-warning flex items-center justify-center text-xl">
                📋
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
