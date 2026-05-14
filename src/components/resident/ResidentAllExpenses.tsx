import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toJalaliString } from "@/lib/jalaliDate";

const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(Math.round(n));

interface Props { buildingId: string; }

export function ResidentAllExpenses({ buildingId }: Props) {
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["resident_all_expenses", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("building_id", buildingId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!buildingId,
  });

  const total = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            همه هزینه‌های ساختمان
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            فهرست کامل هزینه‌های ثبت‌شده برای ساختمان
          </p>
        </div>
        <Card className="px-4 py-2">
          <div className="text-xs text-muted-foreground">جمع کل</div>
          <div className="text-lg font-bold text-primary">{fmt(total)} تومان</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{expenses.length} مورد</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">هزینه‌ای ثبت نشده است</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">تاریخ</TableHead>
                    <TableHead className="text-right">عنوان</TableHead>
                    <TableHead className="text-right">صندوق</TableHead>
                    <TableHead className="text-right">مبلغ</TableHead>
                    <TableHead className="text-right">توضیحات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {toJalaliString(e.expense_date)}
                      </TableCell>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {e.fund_type === "extra_charge" ? "فوق شارژ" : "شارژ"}
                        </Badge>
                      </TableCell>
                      <TableCell>{fmt(Number(e.amount))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                        {e.description || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
