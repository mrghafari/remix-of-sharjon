import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Row = {
  id: string;
  source: "payment" | "expense";
  date: string;
  amount: number;
  fund_type: "charge" | "extra_charge";
  description: string;
  person: string;
  reconciled_at: string | null;
};

const formatAmount = (n: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.round(Math.abs(n)));

export function BankReconciliationDialog({ open, onOpenChange }: Props) {
  const { currentBuildingId } = useBuilding();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "reconciled">("all");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: payments = [], isLoading: pl } = useQuery({
    queryKey: ["recon-payments", currentBuildingId],
    enabled: !!currentBuildingId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,payment_date,amount,fund_type,description,owner_name,resident_name,reconciled_at")
        .eq("building_id", currentBuildingId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: expenses = [], isLoading: el } = useQuery({
    queryKey: ["recon-expenses", currentBuildingId],
    enabled: !!currentBuildingId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id,expense_date,amount,fund_type,title,description,reconciled_at")
        .eq("building_id", currentBuildingId);
      if (error) throw error;
      return data || [];
    },
  });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    (payments as any[]).forEach((p) => {
      out.push({
        id: p.id,
        source: "payment",
        date: p.payment_date,
        amount: Number(p.amount),
        fund_type: p.fund_type,
        description: p.description || "-",
        person: p.resident_name || p.owner_name || "-",
        reconciled_at: p.reconciled_at,
      });
    });
    (expenses as any[]).forEach((e) => {
      out.push({
        id: e.id,
        source: "expense",
        date: e.expense_date,
        amount: -Number(e.amount),
        fund_type: e.fund_type,
        description: e.title || e.description || "-",
        person: "-",
        reconciled_at: e.reconciled_at,
      });
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [payments, expenses]);

  const filtered = useMemo(() => {
    const toLatin = (s: string) =>
      s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
       .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    const q = toLatin(query.trim().toLowerCase()).replace(/[,،\s]/g, "");
    return rows.filter((r) => {
      if (filter === "open" && r.reconciled_at) return false;
      if (filter === "reconciled" && !r.reconciled_at) return false;
      if (!q) return true;
      const hay = toLatin(
        [
          r.description,
          r.person,
          r.date,
          formatJalaliDate(r.date),
          String(Math.round(Math.abs(r.amount))),
          r.fund_type === "charge" ? "شارژ" : "فوق‌شارژ فوق شارژ",
          r.amount >= 0 ? "دریافت" : "پرداخت",
        ].join(" ").toLowerCase()
      ).replace(/[,،]/g, "");
      return hay.includes(q);
    });
  }, [rows, filter, query]);

  const totals = useMemo(() => {
    let reconciled = 0;
    let open = 0;
    rows.forEach((r) => {
      if (r.reconciled_at) reconciled += r.amount;
      else open += r.amount;
    });
    return { reconciled, open };
  }, [rows]);

  const toggle = async (row: Row, checked: boolean) => {
    setSavingId(row.id);
    const table = row.source === "payment" ? "payments" : "expenses";
    const reconciled_at = checked ? new Date().toISOString() : null;
    const { error } = await supabase
      .from(table)
      .update({ reconciled_at })
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast({ title: "خطا", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["recon-payments", currentBuildingId] });
    qc.invalidateQueries({ queryKey: ["recon-expenses", currentBuildingId] });
  };

  const loading = pl || el;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>صورت تطبیق بانکی</DialogTitle>
          <DialogDescription>
            تمام تراکنش‌های صندوق‌ها به ترتیب تاریخ. هر ردیف را با صورت بانکی خود تطبیق دهید و تیک بزنید. اقلام بدون تیک، باز محسوب می‌شوند.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">همه</TabsTrigger>
              <TabsTrigger value="open">باز</TabsTrigger>
              <TabsTrigger value="reconciled">تطبیق‌شده</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="جستجو..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs h-9"
          />
          <div className="flex-1" />
          <Badge variant="outline" className="text-xs">
            تطبیق‌شده: {formatAmount(totals.reconciled)}
            {totals.reconciled < 0 ? "-" : ""}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            باز: {formatAmount(totals.open)}
            {totals.open < 0 ? "-" : ""}
          </Badge>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">موردی یافت نشد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">تیک</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>صندوق</TableHead>
                  <TableHead>شرح</TableHead>
                  <TableHead>شخص</TableHead>
                  <TableHead className="text-left">مبلغ (ریال)</TableHead>
                  <TableHead className="text-xs">زمان تطبیق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const isIncome = r.amount >= 0;
                  return (
                    <TableRow key={`${r.source}-${r.id}`}>
                      <TableCell>
                        {savingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Checkbox
                            checked={!!r.reconciled_at}
                            onCheckedChange={(v) => toggle(r, !!v)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatJalaliDate(r.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${isIncome ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {isIncome ? "دریافت" : "پرداخت"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {r.fund_type === "charge" ? "شارژ" : "فوق‌شارژ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[240px] truncate">{r.description}</TableCell>
                      <TableCell className="text-xs">{r.person}</TableCell>
                      <TableCell
                        className={`text-left font-semibold whitespace-nowrap ${
                          isIncome ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isIncome ? "" : "-"}
                        {formatAmount(r.amount)}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {r.reconciled_at ? formatJalaliDate(r.reconciled_at) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="pt-2 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            بستن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
