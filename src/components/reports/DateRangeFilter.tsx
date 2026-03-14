import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { DateRange } from "@/hooks/useUnitBalanceFiltered";

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const handleClear = () => {
    onDateRangeChange({ from: undefined, to: undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">بازه زمانی:</span>
      
      <JalaliDatePicker
        value={dateRange.from}
        onChange={(d) => onDateRangeChange({ ...dateRange, from: d })}
        placeholder="از تاریخ"
        buttonClassName="min-w-[130px]"
      />

      <span className="text-muted-foreground">تا</span>

      <JalaliDatePicker
        value={dateRange.to}
        onChange={(d) => onDateRangeChange({ ...dateRange, to: d })}
        placeholder="تا تاریخ"
        buttonClassName="min-w-[130px]"
      />

      {(dateRange.from || dateRange.to) && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 ml-1" />
          پاک کردن
        </Button>
      )}
    </div>
  );
}
