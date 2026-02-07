import { useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Receipt, Wallet, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { useUnitBalance } from "@/hooks/useUnitBalance";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { formatJalaliDate } from "@/lib/jalaliDate";

interface UnitDetailReportProps {
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
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

export function UnitDetailReport({ selectedUnitId, onSelectUnit }: UnitDetailReportProps) {
  const { unitBalances, isLoading } = useUnitBalance();
  const { data: categories = [] } = useExpenseCategories();

  const selectedBalance = useMemo(() => {
    return unitBalances.find((ub) => ub.unit.id === selectedUnitId);
  }, [unitBalances, selectedUnitId]);

  const getCategoryLabel = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat ? `${cat.icon} ${cat.label}` : categoryName;
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
      {/* Unit Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            انتخاب واحد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedUnitId || ""} onValueChange={onSelectUnit}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="واحد مورد نظر را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {unitBalances.map((ub) => (
                <SelectItem key={ub.unit.id} value={ub.unit.id}>
                  پلاک {ub.unit.unit_number} - {ub.unit.owner_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                          {payment.fund_type === "charge" ? "شارژ" : "شارژ اضافی"}
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
                    <TableHead className="text-right">دسته‌بندی</TableHead>
                    <TableHead className="text-right">نحوه تسهیم</TableHead>
                    <TableHead className="text-right">مبلغ کل</TableHead>
                    <TableHead className="text-right">سهم این واحد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBalance.expenseBreakdown.map(({ expense, allocatedAmount }) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatJalaliDate(expense.expense_date)}</TableCell>
                      <TableCell>{expense.title}</TableCell>
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
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
    </div>
  );
}
