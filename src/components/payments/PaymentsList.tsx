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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, CreditCard, Pencil } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { usePayments, useDeletePayment, useUpdatePayment, PaymentWithUnit } from "@/hooks/usePayments";
import { useUnits } from "@/hooks/useUnits";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { NumericInput } from "@/components/ui/numeric-input";

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

const persianMonthsList = Object.entries(persianMonths).map(([value, label]) => ({
  value: Number(value),
  label,
}));

const fundTypeLabels: Record<string, string> = {
  charge: "صندوق شارژ",
  extra_charge: "صندوق فوق شارژ",
};

const fundTypes = [
  { value: "charge", label: "صندوق شارژ" },
  { value: "extra_charge", label: "صندوق فوق شارژ" },
];

const years = Array.from({ length: 9 }, (_, i) => 1402 + i);

export function PaymentsList() {
  const { data: payments, isLoading } = usePayments();
  const { data: units } = useUnits();
  const deletePayment = useDeletePayment();
  const updatePayment = useUpdatePayment();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<PaymentWithUnit | null>(null);
  const [editData, setEditData] = useState({
    unit_id: "",
    amount: "",
    month: "",
    year: "",
    fund_type: "charge",
    description: "",
  });

  const handleEditOpen = (payment: PaymentWithUnit) => {
    setEditPayment(payment);
    setEditData({
      unit_id: payment.unit_id,
      amount: String(payment.amount),
      month: String(payment.month),
      year: String(payment.year),
      fund_type: payment.fund_type,
      description: payment.description || "",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment) return;
    updatePayment.mutate(
      {
        id: editPayment.id,
        unit_id: editData.unit_id,
        amount: Number(editData.amount),
        month: Number(editData.month),
        year: Number(editData.year),
        fund_type: editData.fund_type as "charge" | "extra_charge",
        description: editData.description || null,
      },
      { onSuccess: () => setEditPayment(null) }
    );
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deletePayment.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fa-IR").format(Math.round(amount)) + " تومان";
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
    <>
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
                  {payment.unit_id ? (
                    <Badge variant="outline">
                      واحد {payment.units?.unit_number || "-"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      درآمد
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {payment.unit_id ? (payment.units?.owner_name || "-") : "—"}
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditOpen(payment)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(payment.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editPayment} onOpenChange={(open) => !open && setEditPayment(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              ویرایش پرداخت
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>واحد</Label>
              <Select value={editData.unit_id} onValueChange={(v) => setEditData({ ...editData, unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب واحد" /></SelectTrigger>
                <SelectContent>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      واحد {unit.unit_number} - {unit.owner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>مبلغ (تومان)</Label>
              <NumericInput value={editData.amount} onChange={(v) => setEditData({ ...editData, amount: v })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ماه</Label>
                <Select value={editData.month} onValueChange={(v) => setEditData({ ...editData, month: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب ماه" /></SelectTrigger>
                  <SelectContent>
                    {persianMonthsList.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>سال</Label>
                <Select value={editData.year} onValueChange={(v) => setEditData({ ...editData, year: v })}>
                  <SelectTrigger><SelectValue placeholder="انتخاب سال" /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>نوع صندوق</Label>
              <Select value={editData.fund_type} onValueChange={(v) => setEditData({ ...editData, fund_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fundTypes.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>توضیحات (اختیاری)</Label>
              <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updatePayment.isPending} className="w-full">
                {updatePayment.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پرداخت</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این پرداخت اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
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
    </>
  );
}