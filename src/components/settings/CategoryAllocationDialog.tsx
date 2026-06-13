import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
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
  const initialAllowed =
    (category.allocation_settings?.allowed_allocation_types as AllocationType[] | undefined) &&
    category.allocation_settings!.allowed_allocation_types.length > 0
      ? (category.allocation_settings!.allowed_allocation_types as AllocationType[])
      : [category.allocation_settings?.default_allocation_type || "equal"];

  const [allowedTypes, setAllowedTypes] = useState<AllocationType[]>(initialAllowed);
  const [defaultType, setDefaultType] = useState<AllocationType>(
    category.allocation_settings?.default_allocation_type || initialAllowed[0] || "equal"
  );

  const updateAllocation = useUpdateCategoryAllocation();

  const toggleAllowed = (value: AllocationType, checked: boolean) => {
    setAllowedTypes((prev) => {
      let next: AllocationType[];
      if (checked) {
        next = prev.includes(value) ? prev : [...prev, value];
      } else {
        next = prev.filter((t) => t !== value);
      }
      if (next.length > 0 && !next.includes(defaultType)) {
        setDefaultType(next[0]);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (allowedTypes.length === 0) {
      toast({ title: "خطا", description: "حداقل یک روش تسهیم را انتخاب کنید", variant: "destructive" });
      return;
    }
    const finalDefault = allowedTypes.includes(defaultType) ? defaultType : allowedTypes[0];
    updateAllocation.mutate(
      {
        categoryId: category.id,
        allowed_allocation_types: allowedTypes,
        default_allocation_type: finalDefault,
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
            <Label className="text-base font-semibold">روش‌های مجاز تسهیم</Label>
            <p className="text-sm text-muted-foreground">
              می‌توانید چند روش را برای این دسته فعال کنید؛ هنگام ثبت هزینه، یکی از روش‌های انتخاب‌شده قابل گزینش خواهد بود.
            </p>
            <div className="space-y-2">
              {allocationTypes.map((type) => {
                const checked = allowedTypes.includes(type.value);
                return (
                  <div
                    key={type.value}
                    className="flex items-start gap-3 p-3 rounded-md border bg-background"
                  >
                    <Checkbox
                      id={`allowed-${type.value}`}
                      checked={checked}
                      onCheckedChange={(c) => toggleAllowed(type.value, c === true)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`allowed-${type.value}`} className="font-medium cursor-pointer">
                        {type.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {allowedTypes.length > 1 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">روش پیش‌فرض</Label>
              <p className="text-sm text-muted-foreground">
                روشی که به‌صورت پیش‌فرض هنگام ثبت هزینه انتخاب می‌شود.
              </p>
              <RadioGroup value={defaultType} onValueChange={(v) => setDefaultType(v as AllocationType)}>
                {allocationTypes
                  .filter((t) => allowedTypes.includes(t.value))
                  .map((type) => (
                    <div
                      key={type.value}
                      className="flex items-center gap-3 p-2 rounded-md border bg-muted/30"
                    >
                      <RadioGroupItem value={type.value} id={`default-${type.value}`} />
                      <Label htmlFor={`default-${type.value}`} className="font-medium cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            </div>
          )}
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
