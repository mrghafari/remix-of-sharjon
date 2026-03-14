import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

interface JalaliDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  buttonClassName?: string;
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
  disabled,
  buttonClassName,
}: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());

  const monthLabel = format(viewDate, "MMMM yyyy", { locale: faIR });

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { locale: faIR, weekStartsOn: 6 });
    const calEnd = endOfWeek(monthEnd, { locale: faIR, weekStartsOn: 6 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewDate]);

  const isCurrentMonth = (day: Date) => {
    return format(day, "M", { locale: faIR }) === format(viewDate, "M", { locale: faIR }) &&
      format(day, "yyyy", { locale: faIR }) === format(viewDate, "yyyy", { locale: faIR });
  };

  const handleSelect = (day: Date) => {
    onChange?.(day);
    setOpen(false);
  };

  const displayValue = value
    ? format(value, "yyyy/MM/dd", { locale: faIR })
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-right font-normal",
            !value && "text-muted-foreground",
            buttonClassName,
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 pointer-events-auto", className)} align="start">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{monthLabel}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-0">
            {weekDays.map((d) => (
              <div key={d} className="h-8 w-9 flex items-center justify-center text-xs text-muted-foreground font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((day, i) => {
              const inMonth = isCurrentMonth(day);
              const selected = value && isSameDay(day, value);
              const today = isToday(day);
              const dayNum = format(day, "d", { locale: faIR });

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "h-9 w-9 rounded-md text-sm flex items-center justify-center transition-colors",
                    !inMonth && "text-muted-foreground opacity-40",
                    inMonth && "hover:bg-accent",
                    selected && "bg-primary text-primary-foreground hover:bg-primary",
                    today && !selected && "bg-accent text-accent-foreground",
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const today = new Date();
                setViewDate(today);
                handleSelect(today);
              }}
            >
              امروز
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
