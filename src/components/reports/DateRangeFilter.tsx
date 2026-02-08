import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { toJalaliString } from "@/lib/jalaliDate";
import { DateRange } from "@/hooks/useUnitBalanceFiltered";

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const handleClear = () => {
    onDateRangeChange({ from: undefined, to: undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">بازه زمانی:</span>
      
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[130px] justify-start">
            <CalendarIcon className="ml-2 h-4 w-4" />
            {dateRange.from ? toJalaliString(dateRange.from) : "از تاریخ"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.from}
            onSelect={(date) => {
              onDateRangeChange({ ...dateRange, from: date });
              setFromOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">تا</span>

      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[130px] justify-start">
            <CalendarIcon className="ml-2 h-4 w-4" />
            {dateRange.to ? toJalaliString(dateRange.to) : "تا تاریخ"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.to}
            onSelect={(date) => {
              onDateRangeChange({ ...dateRange, to: date });
              setToOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {(dateRange.from || dateRange.to) && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 ml-1" />
          پاک کردن
        </Button>
      )}
    </div>
  );
}
