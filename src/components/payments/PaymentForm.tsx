import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { useCreatePayment } from "@/hooks/usePayments";
import { useUnits } from "@/hooks/useUnits";
import { NumericInput } from "@/components/ui/numeric-input";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";

const persianMonths = [
  { value: 1, label: "فروردین" },
  { value: 2, label: "اردیبهشت" },
  { value: 3, label: "خرداد" },
  { value: 4, label: "تیر" },
  { value: 5, label: "مرداد" },
  { value: 6, label: "شهریور" },
  { value: 7, label: "مهر" },
  { value: 8, label: "آبان" },
  { value: 9, label: "آذر" },
  { value: 10, label: "دی" },
  { value: 11, label: "بهمن" },
  { value: 12, label: "اسفند" },
];

const fundTypes = [
  { value: "charge", label: "صندوق شارژ" },
  { value: "extra_charge", label: "صندوق فوق شارژ" },
];

export function PaymentForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: "",
    amount: "",
    month: "",
    year: "",
    fund_type: "charge",
    description: "",
  });

  const [duplicateInfo, setDuplicateInfo] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: "" });

  const createPayment = useCreatePayment();
  const { data: units } = useUnits();
  const { currentBuildingId } = useBuilding();

  const submitPayment = () => {
    const selectedUnit = units?.find((u) => u.id === formData.unit_id);
    const paymentDate = new Date();
    const paymentAmount = Number(formData.amount);
    const monthNum = Number(formData.month);
    const yearNum = Number(formData.year);
    const fundType = formData.fund_type as "charge" | "extra_charge";
    doCreate(selectedUnit, paymentDate, paymentAmount, monthNum, yearNum, fundType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedUnit = units?.find((u) => u.id === formData.unit_id);
    const paymentDate = new Date();
    const paymentAmount = Number(formData.amount);
    const monthNum = Number(formData.month);
    const yearNum = Number(formData.year);
    const fundType = formData.fund_type as "charge" | "extra_charge";

    // بررسی پرداخت تکراری برای همان واحد/ماه/سال/صندوق
    if (currentBuildingId && formData.unit_id) {
      const { data: existing } = await supabase
        .from("payments")
        .select("id, amount")
        .eq("building_id", currentBuildingId)
        .eq("unit_id", formData.unit_id)
        .eq("month", monthNum)
        .eq("year", yearNum)
        .eq("fund_type", fundType);

      if (existing && existing.length > 0) {
        const fundLabel = fundType === "charge" ? "شارژ" : "فوق‌شارژ";
        const monthLabel = persianMonths.find((m) => m.value === monthNum)?.label || "";
        setDuplicateInfo({
          open: true,
          message: `برای واحد ${selectedUnit?.unit_number} قبلاً ${existing.length} پرداخت ${fundLabel} برای ${monthLabel} ${yearNum} ثبت شده است. در صورت ادامه، پرداخت تکراری ثبت خواهد شد.`,
        });
        return;
      }
    }

    doCreate(selectedUnit, paymentDate, paymentAmount, monthNum, yearNum, fundType);
  };

  const doCreate = (
    selectedUnit: any,
    paymentDate: Date,
    paymentAmount: number,
    monthNum: number,
    yearNum: number,
    fundType: "charge" | "extra_charge"
  ) => {

    createPayment.mutate(
      {
        unit_id: formData.unit_id,
        amount: paymentAmount,
        month: monthNum,
        year: yearNum,
        fund_type: fundType,
        payment_date: paymentDate.toISOString().split("T")[0],
        description: formData.description || null,
        owner_name: selectedUnit?.owner_name || null,
        resident_name: selectedUnit?.resident_name || null,
      } as any,
      {
        onSuccess: () => {
          setOpen(false);
          setDuplicateInfo({ open: false, message: "" });
          setFormData({
            unit_id: "",
            amount: "",
            month: "",
            year: "",
            fund_type: "charge",
            description: "",
          });
        },
      }
    );
  };

  // Generate year options (1402 to 1410)
  const years = Array.from({ length: 9 }, (_, i) => 1402 + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          ثبت پرداخت جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            ثبت پرداخت شارژ
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Unit Selection */}
          <div className="space-y-2">
            <Label>واحد</Label>
            <Select
              value={formData.unit_id}
              onValueChange={(value) =>
                setFormData({ ...formData, unit_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب واحد" />
              </SelectTrigger>
              <SelectContent>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    واحد {unit.unit_number} - {unit.owner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">مبلغ (ریال)</Label>
            <NumericInput
              id="amount"
              value={formData.amount}
              onChange={(value) =>
                setFormData({ ...formData, amount: value })
              }
              required
            />
          </div>

          {/* Month and Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ماه</Label>
              <Select
                value={formData.month}
                onValueChange={(value) =>
                  setFormData({ ...formData, month: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب ماه" />
                </SelectTrigger>
                <SelectContent>
                  {persianMonths.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>سال</Label>
              <Select
                value={formData.year}
                onValueChange={(value) =>
                  setFormData({ ...formData, year: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب سال" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fund Type */}
          <div className="space-y-2">
            <Label>نوع صندوق</Label>
            <Select
              value={formData.fund_type}
              onValueChange={(value) =>
                setFormData({ ...formData, fund_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب صندوق" />
              </SelectTrigger>
              <SelectContent>
                {fundTypes.map((fund) => (
                  <SelectItem key={fund.value} value={fund.value}>
                    {fund.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">توضیحات (اختیاری)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createPayment.isPending}
          >
            {createPayment.isPending ? "در حال ثبت..." : "ثبت پرداخت"}
          </Button>
        </form>
      </DialogContent>

      {/* Duplicate warning dialog */}
      <Dialog
        open={duplicateInfo.open}
        onOpenChange={(o) => setDuplicateInfo((d) => ({ ...d, open: o }))}
      >
        <DialogContent
          dir="rtl"
          className="max-w-md border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-950 dark:text-orange-50 [&>button]:text-orange-900 dark:[&>button]:text-orange-50"
        >
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/20 mb-2">
              <AlertTriangle className="h-7 w-7 text-orange-600 dark:text-orange-300" />
            </div>
            <DialogTitle className="text-center text-orange-900 dark:text-orange-50">
              هشدار: پرداخت تکراری
            </DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm leading-7">
            {duplicateInfo.message}
          </p>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <Button
              variant="outline"
              className="flex-1 border-orange-300 hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-orange-900/40"
              onClick={() => setDuplicateInfo({ open: false, message: "" })}
            >
              انصراف
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={submitPayment}
              disabled={createPayment.isPending}
            >
              {createPayment.isPending && (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              )}
              ادامه و ثبت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
