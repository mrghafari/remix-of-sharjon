import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Calendar, Plus, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCreateExpense, type CreateExpenseData, type AllocationType } from "@/hooks/useExpenses";
import { useUnits } from "@/hooks/useUnits";
import { useCategoriesWithSettings } from "@/hooks/useExpenseCategories";
import { useActiveProjects } from "@/hooks/useProjects";
import { NumericInput } from "@/components/ui/numeric-input";

interface ExpenseFormProps {
  onClose: () => void;
}

// Keep this export for backwards compatibility with ExpensesList
export const categories = [
  { id: "charge", label: "شارژ ماهانه", icon: "💰" },
  { id: "repair", label: "تعمیرات", icon: "🔧" },
  { id: "cleaning", label: "نظافت", icon: "🧹" },
  { id: "elevator", label: "آسانسور", icon: "🛗" },
  { id: "electricity", label: "برق مشاع", icon: "💡" },
  { id: "water", label: "آب مشاع", icon: "💧" },
  { id: "gas", label: "گاز مشاع", icon: "🔥" },
  { id: "security", label: "نگهبانی", icon: "🛡️" },
  { id: "parking", label: "پارکینگ", icon: "🚗" },
  { id: "other", label: "سایر", icon: "📋" },
];

const fundTypes = [
  { value: "charge", label: "صندوق شارژ" },
  { value: "extra_charge", label: "صندوق فوق شارژ" },
];

const allocationTypes: { value: AllocationType; label: string; description: string }[] = [
  { value: "single_unit", label: "فقط واحد مربوطه", description: "هزینه فقط به یک واحد خاص تخصیص می‌یابد" },
  { value: "by_area", label: "بر اساس متراژ", description: "تسهیم بر اساس متراژ هر واحد" },
  { value: "by_residents", label: "بر اساس نفرات", description: "تسهیم بر اساس تعداد ساکنین هر واحد" },
  { value: "by_area_residents", label: "متراژ و نفرات", description: "تسهیم ترکیبی با نسبت دلخواه" },
  { value: "equal", label: "به نسبت مساوی", description: "تقسیم مساوی بین تمام واحدها" },
];

export function ExpenseForm({ onClose }: ExpenseFormProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [fundType, setFundType] = useState<string>("charge");
  const [allocationType, setAllocationType] = useState<AllocationType>("equal");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [areaRatio, setAreaRatio] = useState<number>(50);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  
  const createExpense = useCreateExpense();
  const { data: units } = useUnits();
  const { data: categoriesWithSettings } = useCategoriesWithSettings();
  const { data: projects = [] } = useActiveProjects();

  // Get current category settings
  const currentCategorySetting = categoriesWithSettings?.find(c => c.name === category);
  const allowedTypes = currentCategorySetting?.allocation_settings?.allowed_allocation_types || [];
  const filteredAllocationTypes = allocationTypes.filter(t => allowedTypes.includes(t.value));

  // Reset allocation type when category changes
  useEffect(() => {
    if (currentCategorySetting?.allocation_settings) {
      setAllocationType(currentCategorySetting.allocation_settings.default_allocation_type as AllocationType);
    }
  }, [currentCategorySetting]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !amount || !category) {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدهای ضروری را پر کنید",
        variant: "destructive",
      });
      return;
    }

    if (allocationType === "single_unit" && !selectedUnitId) {
      toast({
        title: "خطا",
        description: "لطفاً واحد مربوطه را انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    const expense: CreateExpenseData = {
      title: title.trim(),
      amount: parseFloat(amount),
      category: category as any,
      expense_date: date,
      description: description.trim() || undefined,
      fund_type: fundType as "charge" | "extra_charge",
      allocation_type: allocationType,
      unit_id: allocationType === "single_unit" ? selectedUnitId : undefined,
      area_ratio: allocationType === "by_area_residents" ? areaRatio : undefined,
      project_id: selectedProjectId || undefined,
    };

    createExpense.mutate(expense, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Card variant="elevated" className="animate-scale-in">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          ثبت هزینه جدید
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان هزینه *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">مبلغ (تومان) *</Label>
              <NumericInput
                id="amount"
                value={amount}
                onChange={setAmount}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">دسته‌بندی *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesWithSettings?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">تاریخ</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>صندوق پرداخت *</Label>
            <Select value={fundType} onValueChange={setFundType}>
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

          <div className="space-y-2">
            <Label>پروژه (اختیاری)</Label>
            <Select 
              value={selectedProjectId || "none"} 
              onValueChange={(val) => setSelectedProjectId(val === "none" ? "" : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب پروژه (اگر هزینه مربوط به پروژه است)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون پروژه</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">توضیحات</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Allocation Type Section */}
          {category && filteredAllocationTypes.length > 0 && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <Label className="text-base font-semibold">نوع تسهیم هزینه *</Label>
              <RadioGroup
                value={allocationType}
                onValueChange={(v) => setAllocationType(v as AllocationType)}
                className="grid gap-2"
              >
                {filteredAllocationTypes.map((type) => (
                  <div key={type.value} className="flex items-start gap-3 p-3 rounded-md border bg-background hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={type.value} className="font-medium cursor-pointer">
                        {type.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

            {/* Unit Selection for single_unit */}
            {allocationType === "single_unit" && (
              <div className="mt-4 space-y-2">
                <Label>انتخاب واحد *</Label>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="واحد مربوطه را انتخاب کنید" />
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
            )}

            {/* Area Ratio Slider for by_area_residents */}
            {allocationType === "by_area_residents" && (
              <div className="mt-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span>نسبت متراژ: {areaRatio}%</span>
                  <span>نسبت نفرات: {100 - areaRatio}%</span>
                </div>
                <Slider
                  value={[areaRatio]}
                  onValueChange={([v]) => setAreaRatio(v)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>بیشتر بر اساس متراژ</span>
                  <span>بیشتر بر اساس نفرات</span>
                </div>
              </div>
            )}
            </div>
          )}

          {category && filteredAllocationTypes.length === 0 && (
            <div className="p-4 bg-muted/30 rounded-lg border text-center text-muted-foreground">
              <p>لطفاً ابتدا دسته‌بندی را انتخاب کنید</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={createExpense.isPending}>
              {createExpense.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  در حال ثبت...
                </>
              ) : (
                "ثبت هزینه"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
