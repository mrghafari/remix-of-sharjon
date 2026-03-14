import { useMemo, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Wallet, Receipt, TrendingUp, TrendingDown, FileSpreadsheet, FileDown, CalendarDays, X } from "lucide-react";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { useUnitBalanceFiltered, DateRange } from "@/hooks/useUnitBalanceFiltered";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { formatJalaliDate, toJalaliString } from "@/lib/jalaliDate";
import type { Unit } from "@/hooks/useUnits";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface UnitFinanceDialogProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

export function UnitFinanceDialog({ unit, open, onOpenChange }: UnitFinanceDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [isExporting, setIsExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const { unitBalances, isLoading } = useUnitBalanceFiltered(dateRange);
  const { data: categories = [] } = useExpenseCategories();

  const balance = useMemo(() => {
    if (!unit) return null;
    return unitBalances.find((ub) => ub.unit.id === unit.id);
  }, [unitBalances, unit]);

  const getCategoryLabel = (name: string) => {
    const cat = categories.find(c => c.name === name);
    return cat ? `${cat.icon} ${cat.label}` : name;
  };

  const transactions = useMemo(() => {
    if (!balance) return [];

    const all: { id: string; date: string; type: "payment" | "expense"; title: string; amount: number; ownerName?: string | null; residentName?: string | null; runningBalance?: number }[] = [];

    balance.paymentBreakdown.forEach((p) => {
      all.push({
        id: p.id,
        date: p.payment_date,
        type: "payment",
        title: `پرداخت ${p.month}/${p.year}${p.description ? ` - ${p.description}` : ""}`,
        amount: p.amount,
        ownerName: (p as any).owner_name,
        residentName: (p as any).resident_name,
      });
    });

    balance.expenseBreakdown.forEach(({ expense, allocatedAmount }) => {
      all.push({
        id: expense.id,
        date: expense.expense_date,
        type: "expense",
        title: `${expense.title} (${getCategoryLabel(expense.category)})`,
        amount: allocatedAmount,
      });
    });


    all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    all.forEach((t) => {
      running += t.type === "payment" ? t.amount : -t.amount;
      t.runningBalance = running;
    });

    return [...all].reverse();
  }, [balance, categories]);

  const handleExportExcel = () => {
    if (!balance || transactions.length === 0 || !unit) return;

    const excelData = transactions.map((t, index) => ({
      ردیف: index + 1,
      تاریخ: formatJalaliDate(t.date),
      "نوع تراکنش": t.type === "payment" ? "دریافت" : "هزینه",
      شرح: t.title,
      دریافت: t.type === "payment" ? Math.round(t.amount) : "",
      هزینه: t.type === "expense" ? Math.round(t.amount) : "",
      مانده: Math.round(t.runningBalance || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { width: 8 }, { width: 15 }, { width: 12 }, { width: 35 }, { width: 15 }, { width: 15 }, { width: 15 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "گردش مالی");

    const fileName = `گردش-مالی-واحد-${unit.unit_number}-${toJalaliString(new Date()).replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleExportPDF = async () => {
    if (!tableRef.current || !unit) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff",
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

      pdf.save(`گردش-مالی-واحد-${unit.unit_number}-${toJalaliString(new Date()).replace(/\//g, "-")}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {unit && <>گردش مالی واحد {unit.unit_number} - {unit.owner_name}</>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b pb-3">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">از</span>
          <JalaliDatePicker
            value={dateRange.from}
            onChange={(d) => setDateRange(prev => ({ ...prev, from: d }))}
            placeholder="از تاریخ"
            buttonClassName="h-7 text-xs px-2 min-w-[100px]"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">تا</span>
          <JalaliDatePicker
            value={dateRange.to}
            onChange={(d) => setDateRange(prev => ({ ...prev, to: d }))}
            placeholder="تا تاریخ"
            buttonClassName="h-7 text-xs px-2 min-w-[100px]"
          />
          {(dateRange.from || dateRange.to) && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDateRange({ from: undefined, to: undefined })}>
              <X className="h-3 w-3" />
            </Button>
          )}
          <div className="flex gap-1.5 mr-auto">
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-1 h-7 text-xs" disabled={transactions.length === 0}>
              <FileSpreadsheet className="w-3 h-3" />
              اکسل
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1 h-7 text-xs" disabled={transactions.length === 0 || isExporting}>
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
              PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : balance ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <Wallet className="w-4 h-4 mx-auto text-green-600 mb-1" />
                <div className="text-xs text-muted-foreground">دریافتی‌ها</div>
                <div className="font-bold text-green-600 text-sm">{formatNumber(balance.totalPayments)}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <Receipt className="w-4 h-4 mx-auto text-red-600 mb-1" />
                <div className="text-xs text-muted-foreground">هزینه‌ها</div>
                <div className="font-bold text-red-600 text-sm">{formatNumber(balance.totalAllocatedExpenses)}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                {balance.balance >= 0 ? (
                  <TrendingUp className="w-4 h-4 mx-auto text-green-600 mb-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mx-auto text-red-600 mb-1" />
                )}
                <div className="text-xs text-muted-foreground">مانده</div>
                <div className={`font-bold text-sm ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(Math.abs(balance.balance))}
                  <Badge variant={balance.balance >= 0 ? "default" : "destructive"} className="mr-1 text-[10px] px-1 py-0">
                    {balance.balance >= 0 ? "بستانکار" : "بدهکار"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div ref={tableRef} className="bg-background p-2">
              {/* PDF Header (visible only in exported PDF) */}
              <div className="text-center mb-3 hidden print:block">
                <h2 className="text-lg font-bold">گردش مالی واحد {unit?.unit_number} - {unit?.owner_name}</h2>
              </div>

              {transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right w-10">#</TableHead>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">نوع</TableHead>
                      <TableHead className="text-right">شرح</TableHead>
                      <TableHead className="text-right">مالک/ساکن</TableHead>
                      <TableHead className="text-right text-green-600">دریافت</TableHead>
                      <TableHead className="text-right text-red-600">هزینه</TableHead>
                      <TableHead className="text-right">مانده</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, i) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground text-xs">{transactions.length - i}</TableCell>
                        <TableCell className="text-sm">{formatJalaliDate(t.date)}</TableCell>
                        <TableCell>
                          {t.type === "payment" ? (
                            <ArrowUpCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{t.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {t.ownerName || "-"}
                          {t.residentName && t.residentName !== t.ownerName && (
                            <span className="block text-[10px]">ساکن: {t.residentName}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium text-sm">
                          {t.type === "payment" ? formatNumber(t.amount) : ""}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium text-sm">
                          {t.type !== "payment" ? formatNumber(t.amount) : ""}
                        </TableCell>
                        <TableCell className={`font-bold text-sm ${(t.runningBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(Math.abs(t.runningBalance || 0))}
                          <span className="text-[10px] mr-0.5">{(t.runningBalance || 0) >= 0 ? "+" : "-"}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted font-bold border-t-2">
                      <TableCell colSpan={5} className="text-left">جمع کل</TableCell>
                      <TableCell className="text-green-600">{formatNumber(balance.totalPayments)}</TableCell>
                      <TableCell className="text-red-600">{formatNumber(balance.totalAllocatedExpenses)}</TableCell>
                      <TableCell className={balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatNumber(Math.abs(balance.balance))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-6">هنوز تراکنشی ثبت نشده</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">اطلاعاتی یافت نشد</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
