import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowUpCircle, ArrowDownCircle, Wallet, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { useUnitBalanceFiltered } from "@/hooks/useUnitBalanceFiltered";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { formatJalaliDate } from "@/lib/jalaliDate";
import type { Unit } from "@/hooks/useUnits";

interface UnitFinanceDialogProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

export function UnitFinanceDialog({ unit, open, onOpenChange }: UnitFinanceDialogProps) {
  const { unitBalances, isLoading } = useUnitBalanceFiltered({ from: undefined, to: undefined });
  const { data: categories = [] } = useExpenseCategories();

  const balance = useMemo(() => {
    if (!unit) return null;
    return unitBalances.find((ub) => ub.unit.id === unit.id);
  }, [unitBalances, unit]);

  const getCategoryLabel = (name: string) => {
    const cat = categories.find(c => c.name === name);
    return cat ? `${cat.icon} ${cat.label}` : name;
  };

  // Combine all transactions chronologically
  const transactions = useMemo(() => {
    if (!balance) return [];

    const all: { id: string; date: string; type: "payment" | "expense"; title: string; amount: number; runningBalance?: number }[] = [];

    balance.paymentBreakdown.forEach((p) => {
      all.push({
        id: p.id,
        date: p.payment_date,
        type: "payment",
        title: `پرداخت ${p.month}/${p.year}${p.description ? ` - ${p.description}` : ""}`,
        amount: p.amount,
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

    return all;
  }, [balance, categories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {unit && <>گردش مالی واحد {unit.unit_number} - {unit.owner_name}</>}
          </DialogTitle>
        </DialogHeader>

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

            {/* Transactions */}
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right w-10">#</TableHead>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">نوع</TableHead>
                      <TableHead className="text-right">شرح</TableHead>
                      <TableHead className="text-right text-green-600">دریافت</TableHead>
                      <TableHead className="text-right text-red-600">هزینه</TableHead>
                      <TableHead className="text-right">مانده</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, i) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="text-sm">{formatJalaliDate(t.date)}</TableCell>
                        <TableCell>
                          {t.type === "payment" ? (
                            <ArrowUpCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{t.title}</TableCell>
                        <TableCell className="text-green-600 font-medium text-sm">
                          {t.type === "payment" ? formatNumber(t.amount) : ""}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium text-sm">
                          {t.type === "expense" ? formatNumber(t.amount) : ""}
                        </TableCell>
                        <TableCell className={`font-bold text-sm ${(t.runningBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatNumber(Math.abs(t.runningBalance || 0))}
                          <span className="text-[10px] mr-0.5">{(t.runningBalance || 0) >= 0 ? "+" : "-"}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">هنوز تراکنشی ثبت نشده</p>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">اطلاعاتی یافت نشد</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
