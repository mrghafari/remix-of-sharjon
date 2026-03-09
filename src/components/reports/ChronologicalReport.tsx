import { useState, useMemo, useRef } from "react";
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
import { Loader2, FileDown, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle, History, Building2 } from "lucide-react";
import { useUnitBalanceFiltered, DateRange } from "@/hooks/useUnitBalanceFiltered";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { formatJalaliDate, toJalaliString } from "@/lib/jalaliDate";
import { DateRangeFilter } from "./DateRangeFilter";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ChronologicalReportProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

type TransactionType = "payment" | "expense";

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  title: string;
  category?: string;
  amount: number;
  runningBalance?: number;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

export function ChronologicalReport({ dateRange, onDateRangeChange }: ChronologicalReportProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>("none");
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  const { unitBalances, isLoading } = useUnitBalanceFiltered(dateRange);
  const { data: categories = [] } = useExpenseCategories();

  const getCategoryLabel = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat ? `${cat.icon} ${cat.label}` : categoryName;
  };

  const selectedBalance = useMemo(() => {
    if (!selectedUnitId || selectedUnitId === "none") return null;
    return unitBalances.find((ub) => ub.unit.id === selectedUnitId);
  }, [unitBalances, selectedUnitId]);

  // Combine payments and expenses into chronological order with running balance
  const transactions = useMemo(() => {
    if (!selectedBalance) return [];

    const allTransactions: Transaction[] = [];

    // Add payments (دریافت - credit)
    selectedBalance.paymentBreakdown.forEach((payment) => {
      allTransactions.push({
        id: payment.id,
        date: payment.payment_date,
        type: "payment",
        title: `پرداخت ${payment.month}/${payment.year}`,
        category: payment.fund_type === "charge" ? "شارژ" : "شارژ اضافی",
        amount: payment.amount,
      });
    });

    // Add expenses (هزینه - debit)
    selectedBalance.expenseBreakdown.forEach(({ expense, allocatedAmount }) => {
      allTransactions.push({
        id: expense.id,
        date: expense.expense_date,
        type: "expense",
        title: expense.title,
        category: getCategoryLabel(expense.category),
        amount: allocatedAmount,
      });
    });

    // Sort by date ascending
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    allTransactions.forEach((t) => {
      if (t.type === "payment") {
        runningBalance += t.amount;
      } else {
        runningBalance -= t.amount;
      }
      t.runningBalance = runningBalance;
    });

    return allTransactions;
  }, [selectedBalance, categories]);

  const handleExportExcel = () => {
    if (!selectedBalance || transactions.length === 0) return;

    const excelData = transactions.map((t, index) => ({
      ردیف: index + 1,
      تاریخ: formatJalaliDate(t.date),
      "نوع تراکنش": t.type === "payment" ? "دریافت" : "هزینه",
      شرح: t.title,
      "دسته‌بندی": t.category || "-",
      دریافت: t.type === "payment" ? Math.round(t.amount) : "",
      هزینه: t.type === "expense" ? Math.round(t.amount) : "",
      مانده: Math.round(t.runningBalance || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { width: 8 },
      { width: 15 },
      { width: 12 },
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "دفتر معین");

    const fileName = `دفتر-معین-واحد-${selectedBalance.unit.unit_number}-${toJalaliString(new Date()).replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportPDF = async () => {
    if (!tableRef.current || !selectedBalance) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `دفتر-معین-واحد-${selectedBalance.unit.unit_number}-${toJalaliString(new Date()).replace(/\//g, "-")}.pdf`;
      pdf.save(fileName);
    } finally {
      setIsExporting(false);
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
            <History className="w-5 h-5" />
            دفتر معین - گردش حساب به ترتیب زمانی
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="واحد مورد نظر را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">انتخاب واحد...</SelectItem>
                {unitBalances.map((ub) => (
                  <SelectItem key={ub.unit.id} value={ub.unit.id}>
                    پلاک {ub.unit.unit_number} - {ub.unit.owner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBalance && transactions.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  اکسل
                </Button>
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  PDF
                </Button>
              </div>
            )}
          </div>

          <DateRangeFilter dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
        </CardContent>
      </Card>

      {selectedBalance && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">واحد</div>
                <div className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  پلاک {selectedBalance.unit.unit_number}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">کل دریافتی‌ها</div>
                <div className="text-xl font-bold text-green-600">
                  {formatNumber(selectedBalance.totalPayments)} تومان
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">کل هزینه‌ها</div>
                <div className="text-xl font-bold text-red-600">
                  {formatNumber(selectedBalance.totalAllocatedExpenses)} تومان
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">مانده نهایی</div>
                <div className={`text-xl font-bold ${selectedBalance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(Math.abs(selectedBalance.balance))} تومان
                  <Badge variant={selectedBalance.balance >= 0 ? "default" : "destructive"} className="mr-2 text-xs">
                    {selectedBalance.balance >= 0 ? "بستانکار" : "بدهکار"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chronological Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                گردش حساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={tableRef} className="bg-background p-4">
                {/* Header for PDF */}
                <div className="text-center mb-4 print:block hidden">
                  <h2 className="text-lg font-bold">دفتر معین واحد {selectedBalance.unit.unit_number}</h2>
                  <p className="text-sm text-muted-foreground">{selectedBalance.unit.owner_name}</p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right w-12">ردیف</TableHead>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">نوع</TableHead>
                      <TableHead className="text-right">شرح</TableHead>
                      <TableHead className="text-right">دسته‌بندی</TableHead>
                      <TableHead className="text-right text-green-600">دریافت</TableHead>
                      <TableHead className="text-right text-red-600">هزینه</TableHead>
                      <TableHead className="text-right">مانده</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, index) => (
                      <TableRow key={t.id} className={t.type === "payment" ? "bg-green-50/50" : "bg-red-50/50"}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>{formatJalaliDate(t.date)}</TableCell>
                        <TableCell>
                          {t.type === "payment" ? (
                            <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                              <ArrowUpCircle className="w-3 h-3" />
                              دریافت
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600 gap-1">
                              <ArrowDownCircle className="w-3 h-3" />
                              هزینه
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>
                          <span className="text-sm">{t.category}</span>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {t.type === "payment" ? formatNumber(t.amount) : "-"}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {t.type === "expense" ? formatNumber(t.amount) : "-"}
                        </TableCell>
                        <TableCell className={`font-bold ${(t.runningBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(Math.abs(t.runningBalance || 0))}
                          <span className="text-xs mr-1">
                            {(t.runningBalance || 0) >= 0 ? "(+)" : "(-)"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          هنوز تراکنشی ثبت نشده
                        </TableCell>
                      </TableRow>
                    )}
                    {/* Total Row */}
                    {transactions.length > 0 && (
                      <TableRow className="bg-muted font-bold border-t-2">
                        <TableCell colSpan={5} className="text-left">جمع کل</TableCell>
                        <TableCell className="text-green-600">
                          {formatNumber(selectedBalance.totalPayments)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {formatNumber(selectedBalance.totalAllocatedExpenses)}
                        </TableCell>
                        <TableCell className={selectedBalance.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatNumber(Math.abs(selectedBalance.balance))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedBalance && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              لطفاً یک واحد را برای مشاهده گردش حساب انتخاب کنید
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
