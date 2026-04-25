import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Receipt, Wallet, TrendingUp, TrendingDown, Building2, FileDown } from "lucide-react";
import { useUnitBalanceFiltered, DateRange } from "@/hooks/useUnitBalanceFiltered";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { generateUnitReportPDF } from "@/lib/pdfGenerator";
import { DateRangeFilter } from "./DateRangeFilter";
import { UnitReportPrintable } from "./UnitReportPrintable";

interface UnitDetailReportProps {
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

const allocationLabels: Record<string, string> = {
  equal: "مساوی",
  by_area: "متراژ",
  by_residents: "نفرات",
  by_area_residents: "متراژ و نفرات",
  single_unit: "واحد خاص",
};

export function UnitDetailReport({ selectedUnitId, onSelectUnit, dateRange, onDateRangeChange }: UnitDetailReportProps) {
  const { unitBalances, isLoading } = useUnitBalanceFiltered(dateRange);
  const { data: categories = [] } = useExpenseCategories();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const selectedBalance = useMemo(() => {
    return unitBalances.find((ub) => ub.unit.id === selectedUnitId);
  }, [unitBalances, selectedUnitId]);

  const getCategoryLabel = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat ? `${cat.icon} ${cat.label}` : categoryName;
  };

  const categoryLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    categories.forEach(cat => {
      labels[cat.name] = `${cat.icon} ${cat.label}`;
    });
    return labels;
  }, [categories]);

  const handleExportPDF = async () => {
    if (!selectedBalance) return;

    setIsGeneratingPDF(true);

    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await generateUnitReportPDF("pdf-report-content", selectedBalance.unit.unit_number);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unit Selector and Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            انتخاب واحد و بازه زمانی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedUnitId || ""} onValueChange={onSelectUnit}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="انتخاب واحد" />
              </SelectTrigger>
              <SelectContent>
                {unitBalances.map((ub) => (
                  <SelectItem key={ub.unit.id} value={ub.unit.id}>
                    پلاک {ub.unit.unit_number} - {ub.unit.owner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
            {selectedBalance && (
              <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1 h-7 text-xs mr-auto" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                {isGeneratingPDF ? "در حال تولید..." : "PDF"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedBalance && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">کل دریافتی‌ها</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(selectedBalance.totalPayments)} تومان
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBalance.paymentBreakdown.length} تراکنش
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">کل هزینه‌های تسهیم‌شده</CardTitle>
                <Receipt className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(selectedBalance.totalAllocatedExpenses)} تومان
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBalance.expenseBreakdown.length} هزینه
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">مانده حساب</CardTitle>
                {selectedBalance.balance >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${selectedBalance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(Math.abs(selectedBalance.balance))} تومان
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBalance.balance >= 0 ? "بستانکار" : "بدهکار"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Wallet className="w-5 h-5" />
                دریافتی‌ها (پرداخت‌های واحد)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاریخ</TableHead>
                    <TableHead className="text-right">دوره</TableHead>
                    <TableHead className="text-right">نوع صندوق</TableHead>
                    <TableHead className="text-right">مبلغ</TableHead>
                    <TableHead className="text-right">توضیحات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBalance.paymentBreakdown.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatJalaliDate(payment.payment_date)}</TableCell>
                      <TableCell>
                        {payment.month}/{payment.year}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.fund_type === "charge" ? "شارژ" : "فوق شارژ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatNumber(payment.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.description || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedBalance.paymentBreakdown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        هنوز پرداختی ثبت نشده
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Receipt className="w-5 h-5" />
                هزینه‌های تسهیم‌شده
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاریخ</TableHead>
                    <TableHead className="text-right">عنوان</TableHead>
                    <TableHead className="text-right">پروژه</TableHead>
                    <TableHead className="text-right">دسته‌بندی</TableHead>
                    <TableHead className="text-right">نحوه تسهیم</TableHead>
                    <TableHead className="text-right">مبلغ کل</TableHead>
                    <TableHead className="text-right">سهم این واحد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBalance.expenseBreakdown.map(({ expense, allocatedAmount, project }) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatJalaliDate(expense.expense_date)}</TableCell>
                      <TableCell>{expense.title}</TableCell>
                      <TableCell>{project ? project.name : "-"}</TableCell>
                      <TableCell>
                        {getCategoryLabel(expense.category)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {allocationLabels[expense.allocation_type] || expense.allocation_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatNumber(expense.amount)}
                      </TableCell>
                      <TableCell className="text-red-600 font-medium">
                        {formatNumber(allocatedAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedBalance.expenseBreakdown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        هنوز هزینه‌ای تسهیم نشده
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedBalance && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              لطفاً یک واحد را برای مشاهده جزئیات انتخاب کنید
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hidden printable component for PDF generation */}
      {selectedBalance && isGeneratingPDF && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            background: "white",
          }}
        >
          <UnitReportPrintable
            unitBalance={selectedBalance}
            dateRange={dateRange}
            categoryLabels={categoryLabels}
          />
        </div>
      )}
    </div>
  );
}
