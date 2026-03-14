import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban, Loader2, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useExpenses, type Expense } from "@/hooks/useExpenses";
import { useUnits } from "@/hooks/useUnits";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useExpenseShares } from "@/hooks/useExpenseShares";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { exportToExcel, exportToPDF, formatNumber, UnitAllocation } from "@/lib/exportUtils";
import { ExpenseDetailsDialog } from "@/components/expenses/ExpenseDetailsDialog";

export function ProjectReport() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: categories = [] } = useExpenseCategories();
  const { data: shares = [] } = useExpenseShares();

  const isLoading = projectsLoading || expensesLoading || unitsLoading;

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const projectExpenses = useMemo(() => {
    if (!selectedProjectId) return [];
    return expenses.filter((e) => e.project_id === selectedProjectId);
  }, [expenses, selectedProjectId]);

  const totalProjectAmount = projectExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const dateRange = useMemo(() => {
    if (projectExpenses.length === 0) return null;
    const dates = projectExpenses.map((e) => new Date(e.expense_date).getTime());
    return {
      from: new Date(Math.min(...dates)),
      to: new Date(Math.max(...dates)),
    };
  }, [projectExpenses]);

  // Build share map from stored snapshots
  const shareMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    shares.forEach((s) => {
      if (!map.has(s.expense_id)) {
        map.set(s.expense_id, new Map());
      }
      map.get(s.expense_id)!.set(s.unit_id, s.allocated_amount);
    });
    return map;
  }, [shares]);

  // Unit allocations using stored shares
  const unitAllocations = useMemo(() => {
    if (!selectedProjectId || units.length === 0) return [];

    return units.map((unit) => {
      const totalAllocated = projectExpenses.reduce((sum, expense) => {
        return sum + (shareMap.get(expense.id)?.get(unit.id) || 0);
      }, 0);

      return {
        unitNumber: unit.unit_number,
        ownerName: unit.owner_name,
        residentName: unit.resident_name,
        area: unit.area,
        residentCount: unit.resident_count,
        allocatedAmount: totalAllocated,
      };
    }).filter((ua) => ua.allocatedAmount > 0);
  }, [projectExpenses, units, shareMap, selectedProjectId]);

  const totalUnitAllocated = unitAllocations.reduce(
    (sum, ua) => sum + ua.allocatedAmount,
    0
  );

  const projectSummaries = useMemo(() => {
    return projects.map((project) => {
      const projExpenses = expenses.filter((e) => e.project_id === project.id);
      const total = projExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const dates = projExpenses.map((e) => new Date(e.expense_date).getTime());
      return {
        ...project,
        totalExpenses: total,
        expenseCount: projExpenses.length,
        firstDate: dates.length > 0 ? new Date(Math.min(...dates)) : null,
        lastDate: dates.length > 0 ? new Date(Math.max(...dates)) : null,
      };
    });
  }, [projects, expenses]);

  const handleExportExcel = () => {
    if (!selectedProject) return;
    exportToExcel(unitAllocations, `پروژه-${selectedProject.name}`, totalUnitAllocated);
  };

  const handleExportPDF = async () => {
    if (!selectedProject) return;
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      await exportToPDF("project-report-content", `پروژه-${selectedProject.name}`);
      setIsGeneratingPDF(false);
    }, 100);
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent className="text-center py-12 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">هنوز پروژه‌ای ثبت نشده است</p>
          <p className="text-sm mt-1">برای مشاهده گزارش پروژه‌ها ابتدا یک پروژه ایجاد کنید</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Projects Overview */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            خلاصه پروژه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نام پروژه</TableHead>
                <TableHead className="text-right">بودجه</TableHead>
                <TableHead className="text-right">هزینه شده</TableHead>
                <TableHead className="text-right">تعداد هزینه</TableHead>
                <TableHead className="text-right">بازه زمانی</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectSummaries.map((proj) => (
                <TableRow
                  key={proj.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedProjectId(proj.id)}
                >
                  <TableCell className="font-medium">{proj.name}</TableCell>
                  <TableCell>
                    {proj.budget ? `${formatNumber(proj.budget)} تومان` : "-"}
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {formatNumber(proj.totalExpenses)} تومان
                  </TableCell>
                  <TableCell>{proj.expenseCount} مورد</TableCell>
                  <TableCell className="text-sm">
                    {proj.firstDate && proj.lastDate ? (
                      <>
                        {formatJalaliDate(proj.firstDate.toISOString())} تا{" "}
                        {formatJalaliDate(proj.lastDate.toISOString())}
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={proj.is_active ? "default" : "secondary"}>
                      {proj.is_active ? "فعال" : "پایان‌یافته"}
                    </Badge>
                    {proj.budget && proj.totalExpenses > proj.budget && (
                      <Badge variant="destructive" className="mr-1">
                        بیش از بودجه
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Project Report */}
      {selectedProjectId && selectedProject && (
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>گزارش تفصیلی: {selectedProject.name}</CardTitle>
              {selectedProject.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedProject.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                اکسل
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                className="gap-2"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div id="project-report-content" dir="rtl" className="space-y-6 bg-background p-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">مجموع هزینه‌ها</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {formatNumber(totalProjectAmount)} تومان
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">بودجه</p>
                  <p className="text-xl font-bold mt-1">
                    {selectedProject.budget
                      ? `${formatNumber(selectedProject.budget)} تومان`
                      : "-"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">مانده بودجه</p>
                  <p
                    className={`text-xl font-bold mt-1 ${
                      selectedProject.budget && totalProjectAmount > selectedProject.budget
                        ? "text-destructive"
                        : "text-primary"
                    }`}
                  >
                    {selectedProject.budget
                      ? `${formatNumber(selectedProject.budget - totalProjectAmount)} تومان`
                      : "-"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">بازه زمانی</p>
                  <p className="text-sm font-medium mt-1">
                    {dateRange
                      ? `${formatJalaliDate(dateRange.from.toISOString())} تا ${formatJalaliDate(dateRange.to.toISOString())}`
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Project Expenses List */}
              <div>
                <h3 className="font-bold mb-3">لیست هزینه‌های پروژه</h3>
                {projectExpenses.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground">
                    هنوز هزینه‌ای برای این پروژه ثبت نشده است
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">ردیف</TableHead>
                        <TableHead className="text-right">عنوان</TableHead>
                        <TableHead className="text-right">دسته‌بندی</TableHead>
                        <TableHead className="text-right">مبلغ</TableHead>
                        <TableHead className="text-right">تاریخ</TableHead>
                        <TableHead className="text-right">روش تسهیم</TableHead>
                        <TableHead className="text-right">جزئیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectExpenses.map((expense, index) => {
                        const catInfo = categories.find((c) => c.name === expense.category) || {
                          label: "سایر",
                          icon: "📋",
                        };
                        return (
                          <TableRow key={expense.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{expense.title}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {catInfo.icon} {catInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold">
                              {formatNumber(Number(expense.amount))} تومان
                            </TableCell>
                            <TableCell>{formatJalaliDate(expense.expense_date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {expense.allocation_type === "equal"
                                  ? "مساوی"
                                  : expense.allocation_type === "by_area"
                                  ? "متراژ"
                                  : expense.allocation_type === "by_residents"
                                  ? "نفرات"
                                  : expense.allocation_type === "by_area_residents"
                                  ? "ترکیبی"
                                  : "واحد خاص"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setDetailsOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3} className="text-left">
                          جمع کل
                        </TableCell>
                        <TableCell className="text-primary">
                          {formatNumber(totalProjectAmount)} تومان
                        </TableCell>
                        <TableCell colSpan={3} />
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Unit Allocations */}
              {unitAllocations.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">سهم هر واحد از پروژه</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">ردیف</TableHead>
                        <TableHead className="text-right">شماره واحد</TableHead>
                        <TableHead className="text-right">نام مالک</TableHead>
                        <TableHead className="text-right">نام ساکن</TableHead>
                        <TableHead className="text-right">متراژ</TableHead>
                        <TableHead className="text-right">سهم از پروژه</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unitAllocations.map((ua, index) => (
                        <TableRow key={ua.unitNumber}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{ua.unitNumber}</TableCell>
                          <TableCell>{ua.ownerName}</TableCell>
                          <TableCell>{ua.residentName || "-"}</TableCell>
                          <TableCell>{ua.area ? `${ua.area} متر` : "-"}</TableCell>
                          <TableCell className="font-bold text-primary">
                            {formatNumber(ua.allocatedAmount)} تومان
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={5} className="text-left">
                          جمع کل
                        </TableCell>
                        <TableCell className="text-primary">
                          {formatNumber(totalUnitAllocated)} تومان
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ExpenseDetailsDialog
        expense={selectedExpense}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
