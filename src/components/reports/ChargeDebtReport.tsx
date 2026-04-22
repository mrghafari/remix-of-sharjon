import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileSpreadsheet, FileText, CreditCard, Wallet, Scale } from "lucide-react";
import { useUnitBalanceFiltered, DateRange } from "@/hooks/useUnitBalanceFiltered";
import { DateRangeFilter } from "./DateRangeFilter";
import { formatJalaliDate, toJalaliString } from "@/lib/jalaliDate";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ChargeDebtReportProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

const fundLabels: Record<string, string> = {
  charge: "شارژ",
  extra_charge: "فوق‌شارژ",
};

export function ChargeDebtReport({ dateRange, onDateRangeChange }: ChargeDebtReportProps) {
  const { unitBalances, isLoading } = useUnitBalanceFiltered(dateRange);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const summaryData = useMemo(() => {
    return unitBalances.map((ub) => {
      const totalCharges = ub.totalCharges;
      const chargePayments = ub.totalPayments;
      return {
        unit: ub.unit,
        totalCharges,
        totalPayments: chargePayments,
        chargeBreakdown: ub.chargeBreakdown || [],
      };
    });
  }, [unitBalances]);

  const selectedUnit = useMemo(() => {
    if (selectedUnitId === "all") return null;
    return summaryData.find((s) => s.unit.id === selectedUnitId);
  }, [summaryData, selectedUnitId]);

  const totalAllCharges = summaryData.reduce((s, u) => s + u.totalCharges, 0);
  const totalAllPayments = summaryData.reduce((s, u) => s + u.totalPayments, 0);

  const handleExportExcel = () => {
    if (selectedUnitId === "all") {
      // Summary export
      const rows = summaryData.map((s, i) => ({
        ردیف: i + 1,
        پلاک: s.unit.unit_number,
        مالک: s.unit.owner_name,
        "کل بدهی شارژ (تومان)": Math.round(s.totalCharges),
        "کل پرداختی (تومان)": Math.round(s.totalPayments),
        "مانده بدهی (تومان)": Math.round(s.totalCharges - s.totalPayments),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ width: 6 }, { width: 10 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "بدهی شارژ");
      XLSX.writeFile(wb, `بدهی-شارژ-${toJalaliString(new Date()).replace(/\//g, "-")}.xlsx`);
    } else if (selectedUnit) {
      const rows = selectedUnit.chargeBreakdown.map((c, i) => ({
        ردیف: i + 1,
        تاریخ: formatJalaliDate(c.created_at),
        "ماه/سال": `${c.month}/${c.year}`,
        نوع: fundLabels[c.fund_type] || c.fund_type,
        مبلغ: Math.round(c.amount),
        مالک: c.owner_name || "-",
        ساکن: c.resident_name || "-",
        توضیحات: c.description || "-",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ریز بدهی شارژ");
      XLSX.writeFile(wb, `ریز-بدهی-واحد-${selectedUnit.unit.unit_number}-${toJalaliString(new Date()).replace(/\//g, "-")}.xlsx`);
    }
  };

  const handleExportPDF = async () => {
    if (!tableRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
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
      pdf.save(`بدهی-شارژ-${toJalaliString(new Date()).replace(/\//g, "-")}.pdf`);
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
      {/* Controls */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center justify-end gap-2 text-right" dir="rtl">
            <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="انتخاب واحد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه واحدها (خلاصه)</SelectItem>
                {summaryData.map((s) => (
                  <SelectItem key={s.unit.id} value={s.unit.id}>
                    واحد {s.unit.unit_number} - {s.unit.owner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
            <div className="flex gap-1.5 mr-auto">
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-3 h-3" />
                اکسل
              </Button>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مجموع بدهی شارژ</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatNumber(selectedUnit ? selectedUnit.totalCharges : totalAllCharges)} تومان
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مجموع پرداختی‌ها</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(selectedUnit ? selectedUnit.totalPayments : totalAllPayments)} تومان
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">مانده بدهی</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {(() => {
              const charges = selectedUnit ? selectedUnit.totalCharges : totalAllCharges;
              const payments = selectedUnit ? selectedUnit.totalPayments : totalAllPayments;
              const remaining = charges - payments;
              return (
                <div className={`text-2xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatNumber(Math.abs(remaining))} تومان
                  {remaining > 0 && <span className="text-sm mr-1">(بدهکار)</span>}
                  {remaining < 0 && <span className="text-sm mr-1">(بستانکار)</span>}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {selectedUnitId === "all" ? "خلاصه بدهی شارژ واحدها" : `ریز بدهی شارژ واحد ${selectedUnit?.unit.unit_number}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={tableRef}>
            {selectedUnitId === "all" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">پلاک</TableHead>
                    <TableHead className="text-right">مالک</TableHead>
                    <TableHead className="text-right">بدهی شارژ</TableHead>
                    <TableHead className="text-right">پرداختی</TableHead>
                    <TableHead className="text-right">مانده</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData.map((s) => {
                    const remaining = s.totalCharges - s.totalPayments;
                    return (
                      <TableRow
                        key={s.unit.id}
                        className="cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setSelectedUnitId(s.unit.id)}
                      >
                        <TableCell className="font-medium">{s.unit.unit_number}</TableCell>
                        <TableCell>{s.unit.owner_name}</TableCell>
                        <TableCell className="text-orange-500">{formatNumber(s.totalCharges)}</TableCell>
                        <TableCell className="text-green-600">{formatNumber(s.totalPayments)}</TableCell>
                        <TableCell className={remaining > 0 ? "text-red-600" : "text-green-600"}>
                          {formatNumber(Math.abs(remaining))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={remaining > 0 ? "text-red-600 border-red-600" : "text-green-600 border-green-600"}>
                            {remaining > 0 ? "بدهکار" : "تسویه"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {summaryData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        واحدی ثبت نشده است
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : selectedUnit ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">تاریخ</TableHead>
                    <TableHead className="text-right">دوره</TableHead>
                    <TableHead className="text-right">نوع</TableHead>
                    <TableHead className="text-right">مبلغ</TableHead>
                    <TableHead className="text-right">مالک</TableHead>
                    <TableHead className="text-right">ساکن</TableHead>
                    <TableHead className="text-right">توضیحات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUnit.chargeBreakdown.length > 0 ? (
                    <>
                      {selectedUnit.chargeBreakdown.map((c, i) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="text-sm">{formatJalaliDate(c.created_at)}</TableCell>
                          <TableCell className="text-sm">{c.month}/{c.year}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              {fundLabels[c.fund_type] || c.fund_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-orange-500 font-medium">{formatNumber(c.amount)}</TableCell>
                          <TableCell className="text-sm">{c.owner_name || "-"}</TableCell>
                          <TableCell className="text-sm">{c.resident_name || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{c.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted font-bold border-t-2">
                        <TableCell colSpan={4} className="text-left">جمع کل</TableCell>
                        <TableCell className="text-orange-500">{formatNumber(selectedUnit.totalCharges)}</TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        بدهی شارژی ثبت نشده است
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
