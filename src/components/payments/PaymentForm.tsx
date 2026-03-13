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
} from "@/components/ui/dialog";
import { Plus, CreditCard } from "lucide-react";
import { useCreatePayment } from "@/hooks/usePayments";
import { useUnits } from "@/hooks/useUnits";
import { NumericInput } from "@/components/ui/numeric-input";

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

  const createPayment = useCreatePayment();
  const { data: units } = useUnits();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createPayment.mutate(
      {
        unit_id: formData.unit_id,
        amount: Number(formData.amount),
        month: Number(formData.month),
        year: Number(formData.year),
        fund_type: formData.fund_type as "charge" | "extra_charge",
        payment_date: new Date().toISOString().split("T")[0],
        description: formData.description || null,
      },
      {
        onSuccess: () => {
          setOpen(false);
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
            <Label htmlFor="amount">مبلغ (تومان)</Label>
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
    </Dialog>
  );
}
