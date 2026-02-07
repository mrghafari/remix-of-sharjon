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
import { Loader2, TrendingUp, TrendingDown, Wallet, Receipt, Scale } from "lucide-react";
import { useUnitBalance } from "@/hooks/useUnitBalance";

interface UnitBalanceReportProps {
  onSelectUnit: (unitId: string) => void;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

export function UnitBalanceReport({ onSelectUnit }: UnitBalanceReportProps) {
  const { unitBalances, isLoading, totals } = useUnitBalance();

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
            بیلان واحدها
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {unitBalances.map((ub) => (
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
              {unitBalances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    هنوز واحدی ثبت نشده است
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
