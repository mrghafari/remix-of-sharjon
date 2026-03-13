import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CreditCard } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { usePayments, useDeletePayment } from "@/hooks/usePayments";
import { formatJalaliDate } from "@/lib/jalaliDate";

const persianMonths: Record<number, string> = {
  1: "فروردین",
  2: "اردیبهشت",
  3: "خرداد",
  4: "تیر",
  5: "مرداد",
  6: "شهریور",
  7: "مهر",
  8: "آبان",
  9: "آذر",
  10: "دی",
  11: "بهمن",
  12: "اسفند",
};

const fundTypeLabels: Record<string, string> = {
  charge: "صندوق شارژ",
  extra_charge: "صندوق فوق شارژ",
};

export function PaymentsList() {
  const { data: payments, isLoading } = usePayments();
  const deletePayment = useDeletePayment();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deletePayment.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!payments?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>هنوز پرداختی ثبت نشده است</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">واحد</TableHead>
            <TableHead className="text-right">مالک</TableHead>
            <TableHead className="text-right">مبلغ</TableHead>
            <TableHead className="text-right">صندوق</TableHead>
            <TableHead className="text-right">ماه/سال</TableHead>
            <TableHead className="text-right">تاریخ پرداخت</TableHead>
            <TableHead className="text-right">توضیحات</TableHead>
            <TableHead className="text-right">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <Badge variant="outline">
                  واحد {payment.units?.unit_number || "-"}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {payment.units?.owner_name || "-"}
              </TableCell>
              <TableCell>
                <span className="text-primary font-semibold">
                  {formatAmount(payment.amount)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={payment.fund_type === "charge" ? "default" : "secondary"}>
                  {fundTypeLabels[payment.fund_type] || "شارژ"}
                </Badge>
              </TableCell>
              <TableCell>
                {persianMonths[payment.month]} {payment.year}
              </TableCell>
              <TableCell>{formatJalaliDate(payment.payment_date)}</TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                {payment.description || "-"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(payment.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پرداخت</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این پرداخت اطمینان دارید؟ این عملیات غیرقابل بازگشت است و امکان بازیابی اطلاعات وجود ندارد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
