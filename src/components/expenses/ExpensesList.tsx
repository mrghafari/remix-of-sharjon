import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Filter, Loader2 } from "lucide-react";
import { categories } from "./ExpenseForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useExpenses, useDeleteExpense, type Expense } from "@/hooks/useExpenses";
import type { Database } from "@/integrations/supabase/types";
import { formatJalaliDate } from "@/lib/jalaliDate";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

const getCategoryInfo = (categoryId: ExpenseCategory) => {
  return categories.find((cat) => cat.id === categoryId) || { label: "سایر", icon: "📋" };
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

const formatDate = (dateString: string) => {
  return formatJalaliDate(dateString);
};

const getCategoryColor = (categoryId: ExpenseCategory) => {
  const colors: Record<string, string> = {
    charge: "bg-primary",
    repair: "bg-warning",
    cleaning: "bg-success",
    elevator: "bg-accent",
    electricity: "bg-yellow-500",
    water: "bg-blue-500",
    gas: "bg-orange-500",
    security: "bg-purple-500",
    parking: "bg-cyan-500",
    other: "bg-muted-foreground",
  };
  return colors[categoryId] || "bg-muted-foreground";
};

export function ExpensesList() {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const { data: expenses = [], isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();

  const filteredExpenses = filterCategory === "all" 
    ? expenses 
    : expenses.filter(exp => exp.category === filterCategory);

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (isLoading) {
    return (
      <Card variant="elevated" className="animate-fade-in">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle>لیست هزینه‌ها</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            مجموع: <span className="font-bold text-foreground">{formatAmount(totalAmount)}</span> تومان
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    {cat.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">هیچ هزینه‌ای ثبت نشده است</p>
            <p className="text-sm mt-1">برای شروع، یک هزینه جدید ثبت کنید</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">عنوان</TableHead>
                  <TableHead className="text-right">دسته‌بندی</TableHead>
                  <TableHead className="text-right">مبلغ</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => {
                  const categoryInfo = getCategoryInfo(expense.category);
                  return (
                    <TableRow key={expense.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.title}</p>
                          {expense.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={`${getCategoryColor(expense.category)} text-primary-foreground`}
                        >
                          <span className="ml-1">{categoryInfo.icon}</span>
                          {categoryInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatAmount(Number(expense.amount))} تومان
                      </TableCell>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>
                        <Badge variant={expense.is_paid ? "default" : "secondary"}>
                          {expense.is_paid ? "پرداخت شده" : "در انتظار"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteExpense.mutate(expense.id)}
                            disabled={deleteExpense.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
