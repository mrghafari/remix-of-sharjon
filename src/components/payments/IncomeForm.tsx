import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { TrendingUp, Wallet } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns-jalali";

const persianMonths = [
  { value: 1, label: "فروردین" }, { value: 2, label: "اردیبهشت" },
  { value: 3, label: "خرداد" }, { value: 4, label: "تیر" },
  { value: 5, label: "مرداد" }, { value: 6, label: "شهریور" },
  { value: 7, label: "مهر" }, { value: 8, label: "آبان" },
  { value: 9, label: "آذر" }, { value: 10, label: "دی" },
  { value: 11, label: "بهمن" }, { value: 12, label: "اسفند" },
];

export function IncomeForm() {
  const today = new Date();
  const currentJYear = parseInt(format(today, "yyyy"));
  const currentJMonth = parseInt(format(today, "MM"));

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [fundType, setFundType] = useState<"charge" | "extra_charge">("charge");
  const [month, setMonth] = useState(String(currentJMonth));
  const [year, setYear] = useState(String(currentJYear));
  const [description, setDescription] = useState("");

  const { currentBuildingId } = useBuilding();
  const qc = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBuildingId) return;

    const amountNum = Math.round(Number(amount) || 0);
    if (amountNum <= 0) {
      toast({ title: "خطا", description: "مبلغ معتبر وارد کنید", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "خطا", description: "توضیحات درآمد الزامی است", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("payments").insert({
        building_id: currentBuildingId,
        unit_id: null,
        amount: amountNum,
        fund_type: fundType,
        month: Number(month),
        year: Number(year),
        payment_date: new Date().toISOString().split("T")[0],
        description: description.trim(),
        owner_name: null,
        resident_name: null,
      } as any);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "موفق", description: "درآمد با موفقیت در صندوق ثبت شد" });
      setOpen(false);
      setAmount("");
      setDescription("");
    } catch (err: any) {
      toast({
        title: "خطا",
        description: err?.message || "خطا در ثبت درآمد",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const years = Array.from({ length: 9 }, (_, i) => 1402 + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          ثبت درآمد عمومی
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            ثبت درآمد در صندوق
          </DialogTitle>
          <p className="text-xs text-muted-foreground pt-1">
            درآمدهای عمومی (مثل سود بانکی، کمک، استرداد از تامین‌کننده) را که به واحد خاصی مرتبط نیست در صندوق انتخابی ثبت کنید.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>مبلغ (ریال)</Label>
            <NumericInput value={amount} onChange={setAmount} required />
          </div>

          <div className="space-y-2">
            <Label>صندوق دریافت‌کننده</Label>
            <Select value={fundType} onValueChange={(v: "charge" | "extra_charge") => setFundType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="charge">صندوق شارژ</SelectItem>
                <SelectItem value="extra_charge">صندوق فوق‌شارژ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ماه</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {persianMonths.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>سال</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>توضیحات (منبع درآمد) <span className="text-destructive">*</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="مثال: سود سالانه حساب بانکی"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "در حال ثبت..." : "ثبت درآمد"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
