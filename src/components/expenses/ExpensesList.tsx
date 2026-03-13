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
import { Trash2, Filter, Loader2, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExpenses, useDeleteExpense, type Expense } from "@/hooks/useExpenses";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useProjects } from "@/hooks/useProjects";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { ExpenseDetailsDialog } from "./ExpenseDetailsDialog";

const fundTypeLabels: Record<string, string> = {
  charge: "صندوق شارژ",
  extra_charge: "صندوق فوق شارژ",
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

const formatDate = (dateString: string) => {
  return formatJalaliDate(dateString);
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
    parking: "bg-cyan-500",
    other: "bg-muted-foreground",
  };
  return colors[categoryId] || "bg-muted-foreground";
};

export function ExpensesList() {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: projects = [] } = useProjects();
  const deleteExpense = useDeleteExpense();

  const filteredExpenses = expenses.filter(exp => {
    const catMatch = filterCategory === "all" || exp.category === filterCategory;
    const projMatch = filterProject === "all" 
      ? true 
      : filterProject === "none" 
        ? !exp.project_id 
        : exp.project_id === filterProject;
    return catMatch && projMatch;
  });

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setDetailsOpen(true);
  };

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
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    {cat.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projects.length > 0 && (
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="همه پروژه‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه پروژه‌ها</SelectItem>
                <SelectItem value="none">بدون پروژه</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    📁 {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
                  <TableHead className="text-right">صندوق</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => {
                  const categoryInfo = categories.find(c => c.name === expense.category) || { label: "سایر", icon: "📋" };
                  const projectInfo = projects.find(p => p.id === expense.project_id);
                  return (
                    <TableRow 
                      key={expense.id} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleExpenseClick(expense)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.title}</p>
                          {expense.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {expense.description}
                            </p>
                          )}
                          {projectInfo && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              پروژه: {projectInfo.name}
                            </Badge>
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
                      <TableCell>
                        <Badge variant={expense.fund_type === "charge" ? "default" : "secondary"}>
                          {fundTypeLabels[expense.fund_type] || "شارژ"}
                        </Badge>
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
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpenseClick(expense);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(expense.id);
                            }}
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

      <ExpenseDetailsDialog
        expense={selectedExpense}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف هزینه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این هزینه اطمینان دارید؟ این عملیات غیرقابل بازگشت است و امکان بازیابی اطلاعات وجود ندارد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteExpense.mutate(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
