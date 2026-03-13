import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useActiveManager } from "@/hooks/useManagers";
import { Expense } from "@/hooks/useExpenses";
import { formatJalaliDate } from "@/lib/jalaliDate";
import {
  calculateAllocatedAmount,
  ManagerDiscount,
  VacantDiscount,
} from "@/hooks/useUnitBalanceFiltered";
import { useBuilding } from "@/contexts/BuildingContext";
import {
  exportToExcel,
  exportToPDF,
  formatNumber,
  UnitAllocation,
} from "@/lib/exportUtils";

interface ExpenseDetailsDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const allocationLabels: Record<string, string> = {
  single_unit: "واحد خاص",
  by_area: "بر اساس متراژ",
  by_residents: "بر اساس تعداد نفرات",
  by_area_residents: "ترکیب متراژ و نفرات",
  equal: "تقسیم مساوی",
};

const fundTypeLabels: Record<string, string> = {
  charge: "صندوق شارژ",
  extra_charge: "صندوق فوق شارژ",
};

export function ExpenseDetailsDialog({
  expense,
  open,
  onOpenChange,
}: ExpenseDetailsDialogProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: activeManager } = useActiveManager();
  const { currentBuilding } = useBuilding();

  if (!expense) return null;

  const managerDiscount: ManagerDiscount | null = activeManager
    ? {
        unitId: activeManager.unit_id,
        chargeDiscountPercent: activeManager.charge_discount_percent,
        extraChargeDiscountPercent: activeManager.extra_charge_discount_percent,
      }
    : null;

  const vacantDiscount: VacantDiscount | null = (() => {
    if (!currentBuilding) return null;
    const c = currentBuilding.vacant_charge_discount_percent || 0;
    const e = currentBuilding.vacant_extra_charge_discount_percent || 0;
    if (c === 0 && e === 0) return null;
    return { chargeDiscountPercent: c, extraChargeDiscountPercent: e };
  })();

  const unitAllocations: UnitAllocation[] = units
    .map((unit) => ({
      unitNumber: unit.unit_number,
      ownerName: unit.owner_name,
      residentName: unit.resident_name,
      area: unit.area,
      residentCount: unit.resident_count,
      allocatedAmount: calculateAllocatedAmount(
        expense,
        unit,
        units,
        managerDiscount,
        vacantDiscount
      ),
    }))
    .filter((ua) => ua.allocatedAmount > 0);

  const totalAllocated = unitAllocations.reduce(
    (sum, ua) => sum + ua.allocatedAmount,
    0
  );

  const handleExportExcel = () => {
    exportToExcel(unitAllocations, expense.title, totalAllocated);
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      await exportToPDF("expense-details-content", expense.title);
      setIsGeneratingPDF(false);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">جزئیات تخصیص هزینه</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            خروجی اکسل
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
            خروجی PDF
          </Button>
        </div>

        <div id="expense-details-content" className="bg-background p-4" dir="rtl">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">عنوان هزینه</p>
              <p className="font-bold">{expense.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مبلغ کل</p>
              <p className="font-bold text-primary">
                {formatNumber(expense.amount)} تومان
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تاریخ</p>
              <p className="font-medium">{formatJalaliDate(expense.expense_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">نوع صندوق</p>
              <Badge variant="secondary">
                {fundTypeLabels[expense.fund_type] || expense.fund_type}
              </Badge>
            </div>
          </div>

          <div className="mb-4">
            <Badge variant="outline" className="text-sm">
              روش تسهیم: {allocationLabels[expense.allocation_type] || expense.allocation_type}
            </Badge>
            {expense.allocation_type === "by_area_residents" && expense.area_ratio && (
              <Badge variant="outline" className="text-sm mr-2">
                نسبت متراژ: {expense.area_ratio}%
              </Badge>
            )}
          </div>

          {/* Allocations Table */}
          {unitsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : unitAllocations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              هیچ تخصیصی برای این هزینه وجود ندارد
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">ردیف</TableHead>
                  <TableHead className="text-right">شماره واحد</TableHead>
                  <TableHead className="text-right">نام مالک</TableHead>
                  <TableHead className="text-right">نام ساکن</TableHead>
                  <TableHead className="text-right">متراژ</TableHead>
                  <TableHead className="text-right">تعداد نفرات</TableHead>
                  <TableHead className="text-right">مبلغ تخصیص یافته</TableHead>
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
                    <TableCell>{ua.residentCount || "-"}</TableCell>
                    <TableCell className="font-bold text-primary">
                      {formatNumber(ua.allocatedAmount)} تومان
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6} className="text-left">
                    جمع کل
                  </TableCell>
                  <TableCell className="text-primary">
                    {formatNumber(totalAllocated)} تومان
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
