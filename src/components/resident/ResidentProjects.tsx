import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderKanban, Loader2, ChevronRight } from "lucide-react";
import { formatJalaliDate } from "@/lib/jalaliDate";

interface Props {
  buildingId: string;
  unitId: string;
}

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString("fa-IR");

export function ResidentProjects({ buildingId, unitId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["resident_projects", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("building_id", buildingId)
        .eq("is_visible_to_residents", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["resident_project_expenses", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, title, amount, expense_date, category, fund_type, project_id, allocation_type")
        .eq("building_id", buildingId)
        .not("project_id", "is", null)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: shares = [] } = useQuery({
    queryKey: ["resident_project_shares", buildingId, unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_unit_shares")
        .select("expense_id, allocated_amount, owner_name, resident_name")
        .eq("building_id", buildingId)
        .eq("unit_id", unitId);
      if (error) throw error;
      return data || [];
    },
  });

  const shareMap = useMemo(() => {
    const m = new Map<string, { amount: number; owner_name: string | null; resident_name: string | null }>();
    shares.forEach((s: any) =>
      m.set(s.expense_id, {
        amount: Number(s.allocated_amount) || 0,
        owner_name: s.owner_name,
        resident_name: s.resident_name,
      })
    );
    return m;
  }, [shares]);

  const projectSummaries = useMemo(() => {
    return projects.map((p: any) => {
      const projExp = expenses.filter((e: any) => e.project_id === p.id);
      const total = projExp.reduce((s, e: any) => s + Number(e.amount), 0);
      const myShare = projExp.reduce((s, e: any) => s + (shareMap.get(e.id)?.amount || 0), 0);
      return { ...p, totalExpenses: total, expenseCount: projExp.length, myShare };
    });
  }, [projects, expenses, shareMap]);

  const selected = selectedId ? projectSummaries.find((p) => p.id === selectedId) : null;
  const selectedExpenses = useMemo(
    () => (selectedId ? expenses.filter((e: any) => e.project_id === selectedId) : []),
    [expenses, selectedId]
  );

  if (loadingProjects || loadingExpenses) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>هیچ پروژه‌ای ثبت نشده است</p>
        </CardContent>
      </Card>
    );
  }

  if (selected) {
    return (
      <div className="space-y-4" dir="rtl">
        <Button variant="outline" size="sm" onClick={() => setSelectedId(null)} className="gap-2">
          <ChevronRight className="w-4 h-4" />
          بازگشت به لیست پروژه‌ها
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary" />
              {selected.name}
            </CardTitle>
            {selected.description && (
              <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">مجموع هزینه‌ها</p>
                <p className="text-lg font-bold text-primary mt-1">{fmt(selected.totalExpenses)} ریال</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">بودجه</p>
                <p className="text-lg font-bold mt-1">
                  {selected.budget ? `${fmt(selected.budget)} ریال` : "-"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">تعداد هزینه</p>
                <p className="text-lg font-bold mt-1">{selected.expenseCount}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">سهم واحد شما</p>
                <p className="text-lg font-bold text-primary mt-1">{fmt(selected.myShare)} ریال</p>
              </div>
            </div>

            <h3 className="font-bold mb-3 text-right">لیست هزینه‌های پروژه</h3>
            {selectedExpenses.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">هزینه‌ای ثبت نشده است</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">عنوان</TableHead>
                      <TableHead className="text-right">تاریخ</TableHead>
                      <TableHead className="text-right">صندوق</TableHead>
                      <TableHead className="text-right">شخص</TableHead>
                      <TableHead className="text-right">نقش</TableHead>
                      <TableHead className="text-right">مبلغ کل</TableHead>
                      <TableHead className="text-right">سهم شما</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedExpenses.map((e: any) => {
                      const sh = shareMap.get(e.id);
                      const isExtra = e.fund_type === "extra_charge";
                      const personName = isExtra
                        ? (sh?.owner_name || sh?.resident_name || "-")
                        : (sh?.resident_name || sh?.owner_name || "-");
                      const roleLabel = isExtra
                        ? (sh?.owner_name ? "مالک" : (sh?.resident_name ? "ساکن" : "-"))
                        : (sh?.resident_name ? "ساکن" : (sh?.owner_name ? "مالک" : "-"));
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.title}</TableCell>
                          <TableCell>{formatJalaliDate(e.expense_date)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {e.fund_type === "extra_charge" ? "فوق‌العاده" : "شارژ"}
                            </Badge>
                          </TableCell>
                          <TableCell>{personName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
                          </TableCell>
                          <TableCell className="font-bold">{fmt(Number(e.amount))} ریال</TableCell>
                          <TableCell className="font-bold text-primary">
                            {fmt(sh?.amount || 0)} ریال
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={5} className="font-bold text-right">جمع کل</TableCell>
                      <TableCell className="font-bold bg-amber-100 dark:bg-amber-900/40 text-right">
                        {fmt(selectedExpenses.reduce((s, e: any) => s + Number(e.amount), 0))} ریال
                      </TableCell>
                      <TableCell className="font-bold bg-amber-100 dark:bg-amber-900/40 text-primary text-right">
                        {fmt(selectedExpenses.reduce((s, e: any) => s + (shareMap.get(e.id)?.amount || 0), 0))} ریال
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            هزینه‌های پروژه‌ای
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            برای مشاهده جزئیات و سهم واحد خود، روی پروژه کلیک کنید
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">نام پروژه</TableHead>
                  <TableHead className="text-right">بودجه</TableHead>
                  <TableHead className="text-right">هزینه شده</TableHead>
                  <TableHead className="text-right">تعداد هزینه</TableHead>
                  <TableHead className="text-right">سهم شما</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectSummaries.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(p.id)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.budget ? `${fmt(p.budget)} ریال` : "-"}</TableCell>
                    <TableCell className="font-bold text-primary">{fmt(p.totalExpenses)} ریال</TableCell>
                    <TableCell>{p.expenseCount} مورد</TableCell>
                    <TableCell className="font-bold text-primary">{fmt(p.myShare)} ریال</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? "فعال" : "پایان‌یافته"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold text-right">جمع کل</TableCell>
                  <TableCell className="font-bold bg-amber-100 dark:bg-amber-900/40 text-right">
                    {fmt(projectSummaries.reduce((s, p: any) => s + (Number(p.budget) || 0), 0))} ریال
                  </TableCell>
                  <TableCell className="font-bold bg-amber-100 dark:bg-amber-900/40 text-primary text-right">
                    {fmt(projectSummaries.reduce((s, p: any) => s + p.totalExpenses, 0))} ریال
                  </TableCell>
                  <TableCell className="font-bold text-right">
                    {projectSummaries.reduce((s, p: any) => s + p.expenseCount, 0)} مورد
                  </TableCell>
                  <TableCell className="font-bold bg-amber-100 dark:bg-amber-900/40 text-primary text-right">
                    {fmt(projectSummaries.reduce((s, p: any) => s + p.myShare, 0))} ریال
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
