import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitBalanceReport } from "./UnitBalanceReport";
import { UnitDetailReport } from "./UnitDetailReport";
import { BarChart3, FileText } from "lucide-react";

export function ReportsPage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">گزارش‌ها</h1>
        <p className="text-muted-foreground mt-1">
          بیلان واحدها و گزارش دریافتی‌ها و هزینه‌ها
        </p>
      </div>

      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="balance" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            بیلان واحدها
          </TabsTrigger>
          <TabsTrigger value="detail" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            جزئیات واحد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance" className="mt-6">
          <UnitBalanceReport onSelectUnit={setSelectedUnitId} />
        </TabsContent>

        <TabsContent value="detail" className="mt-6">
          <UnitDetailReport 
            selectedUnitId={selectedUnitId} 
            onSelectUnit={setSelectedUnitId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
