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
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground whitespace-nowrap">از</span>
      <JalaliDatePicker
        value={dateRange.from}
        onChange={(d) => onDateRangeChange({ ...dateRange, from: d })}
        placeholder="از تاریخ"
        buttonClassName="h-7 text-xs px-2 min-w-[100px]"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">تا</span>
      <JalaliDatePicker
        value={dateRange.to}
        onChange={(d) => onDateRangeChange({ ...dateRange, to: d })}
        placeholder="تا تاریخ"
        buttonClassName="h-7 text-xs px-2 min-w-[100px]"
      />
      {(dateRange.from || dateRange.to) && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
