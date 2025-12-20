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
import { Eye, Edit, Trash2, Filter } from "lucide-react";
import { ExpenseData, categories } from "./ExpenseForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface ExpensesListProps {
  expenses: ExpenseData[];
  onEdit?: (expense: ExpenseData) => void;
  onDelete?: (id: string) => void;
}

const getCategoryInfo = (categoryId: string) => {
  return categories.find((cat) => cat.id === categoryId) || { label: "سایر", icon: "📋" };
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fa-IR").format(date);
};

const getCategoryColor = (categoryId: string) => {
  const colors: Record<string, string> = {
    charge: "bg-primary",
    repair: "bg-warning",
    cleaning: "bg-success",
    elevator: "bg-accent",
    electricity: "bg-yellow-500",
    water: "bg-blue-500",
    gas: "bg-orange-500",
    security: "bg-purple-500",
    garden: "bg-green-500",
    other: "bg-muted-foreground",
  };
  return colors[categoryId] || "bg-muted-foreground";
};

export function ExpensesList({ expenses, onEdit, onDelete }: ExpensesListProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredExpenses = filterCategory === "all" 
    ? expenses 
    : expenses.filter(exp => exp.category === filterCategory);

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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
                  <TableHead className="text-right">پرداخت کننده</TableHead>
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
                        {formatAmount(expense.amount)} تومان
                      </TableCell>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>{expense.paidBy}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onEdit?.(expense)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete?.(expense.id)}
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
