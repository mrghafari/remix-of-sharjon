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
import { Trash2, Filter, Loader2, Eye, Paperclip, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { ExpenseDetailsDialog } from "./ExpenseDetailsDialog";
import { useBuilding } from "@/contexts/BuildingContext";
import { toast } from "@/hooks/use-toast";

const fundTypeLabels: Record<string, string> = {
  charge: "صندوق شارژ",
  extra_charge: "صندوق فوق شارژ",
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(Math.round(amount));
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
  const [uploadingExpenseId, setUploadingExpenseId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetExpenseIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();

  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: projects = [] } = useProjects();
  const deleteExpense = useDeleteExpense();

  const { data: attachmentCounts = {} } = useQuery({
    queryKey: ["expense-attachments-summary", expenses.map((exp) => exp.id).join(",")],
    queryFn: async () => {
      if (expenses.length === 0) return {} as Record<string, number>;

      const { data, error } = await supabase
        .from("expense_attachments")
        .select("expense_id")
        .in("expense_id", expenses.map((exp) => exp.id));

      if (error) throw error;

      return (data || []).reduce((acc, row) => {
        const expenseId = row.expense_id;
        acc[expenseId] = (acc[expenseId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    },
    enabled: expenses.length > 0,
  });

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

  const triggerUpload = (expenseId: string) => {
    targetExpenseIdRef.current = expenseId;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const expenseId = targetExpenseIdRef.current;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (fileInputRef.current) fileInputRef.current.value = "";
    targetExpenseIdRef.current = null;
    if (!expenseId || !currentBuildingId || files.length === 0) return;

    // Immediate feedback
    toast({
      title: "در حال آپلود",
      description: `${files.length} فایل در حال ارسال است...`,
    });

    setUploadingExpenseId(expenseId);

    const uploadOne = async (file: File, index: number) => {
      try {
        const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
        const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "bin";
        const filePath = `${currentBuildingId}/${expenseId}/${Date.now()}_${index}_${crypto.randomUUID()}.${safeExtension}`;
        const { error: uploadError } = await supabase.storage
          .from("expense-attachments")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          console.error("Upload error for", file.name, uploadError);
          return { ok: false, name: file.name, message: uploadError.message };
        }
        const { error: insertError } = await supabase.from("expense_attachments").insert({
          expense_id: expenseId,
          building_id: currentBuildingId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        });
        if (insertError) {
          console.error("DB insert error for", file.name, insertError);
          // Cleanup orphan file
          await supabase.storage.from("expense-attachments").remove([filePath]);
          return { ok: false, name: file.name, message: insertError.message };
        }
        return { ok: true as const, name: file.name };
      } catch (err: any) {
        console.error("Unexpected upload error for", file.name, err);
        return { ok: false, name: file.name, message: err?.message || "خطای ناشناخته" };
      }
    };

    try {
      // Upload in parallel for better speed
      const results = await Promise.all(files.map((f, i) => uploadOne(f, i)));
      const successCount = results.filter((r) => r.ok).length;
      const failures = results.filter((r) => !r.ok);

      await queryClient.invalidateQueries({ queryKey: ["expense-attachments-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["expense_attachments", expenseId] });

      if (failures.length === 0) {
        toast({
          title: "موفق",
          description: `${successCount} فایل با موفقیت آپلود شد`,
        });
      } else {
        toast({
          title: "خطا در آپلود برخی فایل‌ها",
          description: `${successCount} از ${files.length} فایل آپلود شد. خطا: ${failures[0].message}`,
          variant: "destructive",
        });
      }
    } finally {
      setUploadingExpenseId(null);
    }
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
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => {
                  const categoryInfo = categories.find(c => c.name === expense.category) || { label: "سایر", icon: "📋" };
                  const projectInfo = projects.find(p => p.id === expense.project_id);
                  const attachmentCount = attachmentCounts[expense.id] || 0;
                  const hasAttachments = attachmentCount > 0;
                  return (
                    <TableRow 
                      key={expense.id} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleExpenseClick(expense)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            <span>{expense.title}</span>
                            {hasAttachments && (
                              <span className="inline-flex items-center gap-1 text-primary text-xs">
                                <Paperclip className="w-3.5 h-3.5" />
                                {attachmentCount}
                              </span>
                            )}
                          </p>
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            title="افزودن پیوست"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerUpload(expense.id);
                            }}
                            disabled={uploadingExpenseId === expense.id}
                          >
                            {uploadingExpenseId === expense.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </Button>
                          {hasAttachments && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary"
                              title="مشاهده پیوست‌ها"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExpenseClick(expense);
                              }}
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            title="مشاهده جزئیات"
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
                            title="حذف"
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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.xlsx,.xls"
        className="hidden"
        onChange={handleFilesSelected}
      />

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
