import { useState } from "react";
import { UnitBalanceReport } from "./UnitBalanceReport";
import { UnitDetailReport } from "./UnitDetailReport";
import { DateRangeFilter } from "./DateRangeFilter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { DateRange } from "@/hooks/useUnitBalanceFiltered";

export function ReportsPage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
  };

  const handleBack = () => {
    setSelectedUnitId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {selectedUnitId ? (
        <>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowRight className="w-4 h-4 ml-2" />
              بازگشت به لیست
            </Button>
          </div>
          <UnitDetailReport 
            selectedUnitId={selectedUnitId} 
            onSelectUnit={setSelectedUnitId}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">گزارش‌ها</h1>
              <p className="text-muted-foreground mt-1">
                بیلان واحدها - برای مشاهده جزئیات روی هر سطر کلیک کنید
              </p>
            </div>
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
          <UnitBalanceReport onSelectUnit={handleSelectUnit} dateRange={dateRange} />
        </>
      )}
    </div>
  );
}
