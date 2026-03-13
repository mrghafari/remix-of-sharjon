import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Wallet, Receipt, Scale, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { useUnitBalanceFiltered, DateRange, UnitBalance } from "@/hooks/useUnitBalanceFiltered";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toJalaliString } from "@/lib/jalaliDate";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface UnitBalanceReportProps {
  onSelectUnit: (unitId: string) => void;
  dateRange: DateRange;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

function exportBalanceExcel(data: UnitBalance[], debtorsOnly: boolean) {
  const filtered = debtorsOnly ? data.filter(ub => ub.balance < 0) : data;
  const rows = filtered.map((ub, i) => ({
    ردیف: i + 1,
    پلاک: ub.unit.unit_number,
    مالک: ub.unit.owner_name,
    "دریافتی‌ها (تومان)": Math.round(ub.totalPayments),
    "هزینه تسهیم‌شده (تومان)": Math.round(ub.totalAllocatedExpenses),
    "مانده (تومان)": Math.round(ub.balance),
    وضعیت: ub.balance >= 0 ? "بستانکار" : "بدهکار",
  }));

  const totalPayments = filtered.reduce((s, u) => s + u.totalPayments, 0);
  const totalExpenses = filtered.reduce((s, u) => s + u.totalAllocatedExpenses, 0);
  const totalBalance = filtered.reduce((s, u) => s + u.balance, 0);

  rows.push({
    ردیف: "" as any,
    پلاک: "",
    مالک: "جمع کل",
    "دریافتی‌ها (تومان)": Math.round(totalPayments),
    "هزینه تسهیم‌شده (تومان)": Math.round(totalExpenses),
    "مانده (تومان)": Math.round(totalBalance),
    وضعیت: "",
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { width: 6 }, { width: 10 }, { width: 20 },
    { width: 20 }, { width: 22 }, { width: 18 }, { width: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, debtorsOnly ? "بدهکاران" : "بیلان واحدها");
  const label = debtorsOnly ? "بدهکاران" : "بیلان";
  XLSX.writeFile(wb, `${label}-${toJalaliString(new Date()).replace(/\//g, "-")}.xlsx`);
}

async function exportBalancePDF(elementRef: HTMLDivElement | null, debtorsOnly: boolean) {
  if (!elementRef) return;
  const canvas = await html2canvas(elementRef, {
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
  const label = debtorsOnly ? "بدهکاران" : "بیلان";
  pdf.save(`${label}-${toJalaliString(new Date()).replace(/\//g, "-")}.pdf`);
}

export function UnitBalanceReport({ onSelectUnit, dateRange }: UnitBalanceReportProps) {
  const { unitBalances, isLoading, totals } = useUnitBalanceFiltered(dateRange);
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const displayData = debtorsOnly ? unitBalances.filter(ub => ub.balance < 0) : unitBalances;

  const handleExportExcel = () => {
    exportBalanceExcel(unitBalances, debtorsOnly);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportBalancePDF(tableRef.current, debtorsOnly);
    } finally {
      setExporting(false);
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
      {/* Export Bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Switch
                id="debtorsOnly"
                checked={debtorsOnly}
                onCheckedChange={setDebtorsOnly}
              />
              <Label htmlFor="debtorsOnly" className="cursor-pointer text-sm">
                فقط بدهکاران
              </Label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" />
              خروجی اکسل
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              خروجی PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مجموع دریافتی‌ها</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(totals.totalPayments)} تومان
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مجموع هزینه‌ها</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(totals.totalExpenses)} تومان
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مانده کل</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatNumber(Math.abs(totals.totalBalance))} تومان
              {totals.totalBalance < 0 && <span className="text-sm mr-1">(بدهکار)</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            {debtorsOnly ? "لیست بدهکاران" : "بیلان واحدها"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={tableRef}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">پلاک</TableHead>
                  <TableHead className="text-right">مالک</TableHead>
                  <TableHead className="text-right">دریافتی‌ها</TableHead>
                  <TableHead className="text-right">هزینه‌های تسهیم‌شده</TableHead>
                  <TableHead className="text-right">مانده</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((ub) => (
                  <TableRow 
                    key={ub.unit.id}
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => onSelectUnit(ub.unit.id)}
                  >
                    <TableCell className="font-medium">{ub.unit.unit_number}</TableCell>
                    <TableCell>{ub.unit.owner_name}</TableCell>
                    <TableCell className="text-green-600">
                      {formatNumber(ub.totalPayments)}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {formatNumber(ub.totalAllocatedExpenses)}
                    </TableCell>
                    <TableCell className={ub.balance >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatNumber(Math.abs(ub.balance))}
                    </TableCell>
                    <TableCell>
                      {ub.balance >= 0 ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <TrendingUp className="w-3 h-3 ml-1" />
                          بستانکار
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <TrendingDown className="w-3 h-3 ml-1" />
                          بدهکار
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {displayData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {debtorsOnly ? "واحد بدهکاری وجود ندارد" : "هنوز واحدی ثبت نشده است"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
