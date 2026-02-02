import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowUpLeft, ArrowDownRight } from "lucide-react";
import { usePayments, FundType } from "@/hooks/usePayments";
import { useExpenses } from "@/hooks/useExpenses";
import { formatJalaliDate } from "@/lib/jalaliDate";

interface FundTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fundType: FundType;
  fundName: string;
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("fa-IR").format(amount);
};

export function FundTransactionsDialog({
  open,
  onOpenChange,
  fundType,
  fundName,
}: FundTransactionsDialogProps) {
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const fundPayments = payments.filter((p) => p.fund_type === fundType);
  const fundExpenses = expenses.filter((e) => e.fund_type === fundType);

  // Combine and sort by date
  const transactions = [
    ...fundPayments.map((p) => ({
      id: p.id,
      type: "income" as const,
      amount: Number(p.amount),
      date: p.payment_date,
      description: p.description || `پرداخت واحد ${p.units?.unit_number || "-"}`,
      unit: p.units?.unit_number,
    })),
    ...fundExpenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      amount: Number(e.amount),
      date: e.expense_date,
      description: e.title,
      unit: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            تراکنش‌های {fundName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              هیچ تراکنشی ثبت نشده است
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === "income"
                          ? "bg-green-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowUpLeft className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatJalaliDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge
                      variant={transaction.type === "income" ? "default" : "destructive"}
                      className="font-medium"
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
