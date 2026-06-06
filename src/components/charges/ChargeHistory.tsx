import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { History, Trash2, Loader2 } from "lucide-react";
import { useUnitCharges, useDeleteUnitCharge } from "@/hooks/useUnitCharges";
import { useUnits } from "@/hooks/useUnits";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

function formatNumber(n: number) {
  return Math.round(n).toLocaleString("fa-IR");
}

export function ChargeHistory() {
  const { data: charges = [], isLoading } = useUnitCharges();
  const { data: units = [] } = useUnits();
  const deleteCharge = useDeleteUnitCharge();
  const [filterUnit, setFilterUnit] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const unitMap = new Map(units.map((u) => [u.id, u]));

  const filtered = filterUnit === "all"
    ? charges
    : charges.filter((c) => c.unit_id === filterUnit);

  // Group by period
  const sorted = [...filtered].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.created_at > b.created_at ? -1 : 1;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCharge.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            سوابق شارژ اعمال‌شده
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="فیلتر واحد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه واحدها</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    واحد {u.unit_number} - {u.owner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {sorted.length} مورد
            </span>
          </div>

          {sorted.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              شارژی اعمال نشده است
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">دوره</TableHead>
                  <TableHead className="text-right">واحد</TableHead>
                  <TableHead className="text-right">مالک/ساکن</TableHead>
                  <TableHead className="text-right">نوع</TableHead>
                  <TableHead className="text-right">مبلغ</TableHead>
                  <TableHead className="text-right">پرداختی</TableHead>
                  <TableHead className="text-right">باقیمانده</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">توضیحات</TableHead>
                  <TableHead className="text-right">تاریخ اعمال</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c) => {
                  const unit = unitMap.get(c.unit_id);
                  const amount = Number(c.amount);
                  const paid = Number(c.paid_amount || 0);
                  const remaining = Math.max(0, amount - paid);
                  const isPaid = remaining === 0 && paid > 0;
                  const isPartial = paid > 0 && remaining > 0;
                  return (
                    <TableRow key={c.id} className={isPaid ? "opacity-60" : ""}>
                      <TableCell className="text-xs">
                        {JALALI_MONTHS[(c.month || 1) - 1]} {c.year}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {unit?.unit_number || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.owner_name || unit?.owner_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {c.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {formatNumber(amount)} ریال
                      </TableCell>
                      <TableCell className="text-xs text-green-600">
                        {paid > 0 ? `${formatNumber(paid)} ریال` : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-destructive font-medium">
                        {remaining > 0 ? `${formatNumber(remaining)} ریال` : "-"}
                      </TableCell>
                      <TableCell>
                        {isPaid ? (
                          <Badge className="text-xs bg-green-600 hover:bg-green-700">پرداخت شده</Badge>
                        ) : isPartial ? (
                          <Badge variant="secondary" className="text-xs">پرداخت جزئی</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">پرداخت نشده</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.description || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.created_at ? format(new Date(c.created_at), "yyyy/MM/dd", { locale: faIR }) : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteTarget(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف شارژ</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این رکورد شارژ اطمینان دارید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteCharge.isPending}>
              {deleteCharge.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
