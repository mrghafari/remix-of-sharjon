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
  const [allowedTypes, setAllowedTypes] = useState<AllocationType[]>(
    category.allocation_settings?.allowed_allocation_types || []
  );
  const [defaultType, setDefaultType] = useState<AllocationType>(
    category.allocation_settings?.default_allocation_type || "equal"
  );
  
  const updateAllocation = useUpdateCategoryAllocation();

  // Ensure default type is in allowed types
  useEffect(() => {
    if (!allowedTypes.includes(defaultType) && allowedTypes.length > 0) {
      setDefaultType(allowedTypes[0]);
    }
  }, [allowedTypes, defaultType]);

  const handleToggleType = (type: AllocationType, checked: boolean) => {
    if (checked) {
      setAllowedTypes([...allowedTypes, type]);
    } else {
      // Don't allow removing if it's the only one or if it's the default
      if (allowedTypes.length > 1) {
        setAllowedTypes(allowedTypes.filter(t => t !== type));
      }
    }
  };

  const handleSave = () => {
    updateAllocation.mutate(
      {
        categoryId: category.id,
        allowed_allocation_types: allowedTypes,
        default_allocation_type: defaultType,
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
            <Label className="text-base font-semibold">انواع تسهیم مجاز</Label>
            <p className="text-sm text-muted-foreground">
              انتخاب کنید کدام روش‌های تسهیم برای این دسته‌بندی در دسترس باشد
            </p>
            <div className="grid gap-2">
              {allocationTypes.map((type) => (
                <div 
                  key={type.value} 
                  className="flex items-start gap-3 p-3 rounded-md border bg-background"
                >
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={allowedTypes.includes(type.value)}
                    onCheckedChange={(checked) => handleToggleType(type.value, !!checked)}
                    disabled={allowedTypes.length === 1 && allowedTypes.includes(type.value)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`type-${type.value}`} className="font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">نوع تسهیم پیش‌فرض</Label>
            <RadioGroup value={defaultType} onValueChange={(v) => setDefaultType(v as AllocationType)}>
              {allocationTypes
                .filter(t => allowedTypes.includes(t.value))
                .map((type) => (
                  <div key={type.value} className="flex items-center gap-3 p-2">
                    <RadioGroupItem value={type.value} id={`default-${type.value}`} />
                    <Label htmlFor={`default-${type.value}`} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={updateAllocation.isPending || allowedTypes.length === 0}>
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
