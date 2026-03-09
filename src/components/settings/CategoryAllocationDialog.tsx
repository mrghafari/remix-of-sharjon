import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useUpdateCategoryAllocation, type CategoryWithSettings } from "@/hooks/useExpenseCategories";
import type { AllocationType } from "@/hooks/useExpenses";

const allocationTypes: { value: AllocationType; label: string; description: string }[] = [
  { value: "equal", label: "به نسبت مساوی", description: "تقسیم مساوی بین تمام واحدها" },
  { value: "by_area", label: "بر اساس متراژ", description: "تسهیم بر اساس متراژ هر واحد" },
  { value: "by_residents", label: "بر اساس نفرات", description: "تسهیم بر اساس تعداد ساکنین هر واحد" },
  { value: "by_area_residents", label: "متراژ و نفرات", description: "تسهیم ترکیبی با نسبت دلخواه" },
  { value: "single_unit", label: "فقط واحد مربوطه", description: "هزینه فقط به یک واحد خاص تخصیص می‌یابد" },
];

interface CategoryAllocationDialogProps {
  category: CategoryWithSettings;
  onClose: () => void;
}

export function CategoryAllocationDialog({ category, onClose }: CategoryAllocationDialogProps) {
  const [selectedType, setSelectedType] = useState<AllocationType>(
    category.allocation_settings?.default_allocation_type || "equal"
  );
  
  const updateAllocation = useUpdateCategoryAllocation();

  const handleSave = () => {
    updateAllocation.mutate(
      {
        categoryId: category.id,
        allowed_allocation_types: [selectedType],
        default_allocation_type: selectedType,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            تنظیمات تسهیم - {category.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">نوع تسهیم</Label>
            <p className="text-sm text-muted-foreground">
              روش تسهیم هزینه برای این دسته‌بندی را انتخاب کنید
            </p>
            <RadioGroup value={selectedType} onValueChange={(v) => setSelectedType(v as AllocationType)}>
              {allocationTypes.map((type) => (
                <div 
                  key={type.value} 
                  className="flex items-start gap-3 p-3 rounded-md border bg-background"
                >
                  <RadioGroupItem value={type.value} id={`type-${type.value}`} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={`type-${type.value}`} className="font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={updateAllocation.isPending}>
            {updateAllocation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                در حال ذخیره...
              </>
            ) : (
              "ذخیره تنظیمات"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
