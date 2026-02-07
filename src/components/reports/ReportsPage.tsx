import { useState } from "react";
import { UnitBalanceReport } from "./UnitBalanceReport";
import { UnitDetailReport } from "./UnitDetailReport";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function ReportsPage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

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
          />
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">گزارش‌ها</h1>
            <p className="text-muted-foreground mt-1">
              بیلان واحدها - برای مشاهده جزئیات روی هر سطر کلیک کنید
            </p>
          </div>
          <UnitBalanceReport onSelectUnit={handleSelectUnit} />
        </>
      )}
    </div>
  );
}
