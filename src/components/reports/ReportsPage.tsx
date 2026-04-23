import { useState } from "react";
import { UnitBalanceReport } from "./UnitBalanceReport";
import { UnitDetailReport } from "./UnitDetailReport";
import { ProjectReport } from "./ProjectReport";
import { ChronologicalReport } from "./ChronologicalReport";
import { ChargeDebtReport } from "./ChargeDebtReport";
import { ManagersHistoryReport } from "./ManagersHistoryReport";
import { DateRangeFilter } from "./DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, FileText, FolderKanban, History, CreditCard, UserCog } from "lucide-react";
import { DateRange } from "@/hooks/useUnitBalanceFiltered";

export function ReportsPage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [activeTab, setActiveTab] = useState("units");

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
  };

  const handleBack = () => {
    setSelectedUnitId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">گزارش‌ها</h1>
            <p className="text-muted-foreground mt-1">
              {activeTab === "units"
                ? "بیلان واحدها - برای مشاهده جزئیات روی هر سطر کلیک کنید"
                : activeTab === "charges"
                ? "گزارش بدهی شارژ - مبالغ اعلام‌شده و وضعیت پرداخت هر واحد"
                : activeTab === "chronological"
                ? "دفتر معین - گردش حساب به ترتیب زمانی با مانده"
                : activeTab === "managers"
                ? "سوابق مدیران - مدیر فعال و تاریخچه مدیران پیشین به تفکیک نقش"
                : "گزارش مالی پروژه‌ها - سهم هر واحد از هزینه‌های پروژه"}
            </p>
          </div>
          <TabsList className="grid w-full sm:w-auto grid-cols-5">
            <TabsTrigger value="units" className="gap-2">
              <FileText className="w-4 h-4" />
              بیلان واحدها
            </TabsTrigger>
            <TabsTrigger value="charges" className="gap-2">
              <CreditCard className="w-4 h-4" />
              بدهی شارژ
            </TabsTrigger>
            <TabsTrigger value="chronological" className="gap-2">
              <History className="w-4 h-4" />
              دفتر معین
            </TabsTrigger>
            <TabsTrigger value="managers" className="gap-2">
              <UserCog className="w-4 h-4" />
              سوابق مدیران
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="w-4 h-4" />
              پروژه‌ها
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="units" className="space-y-6 mt-6">
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
              <div className="flex justify-end" dir="rtl">
                <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
              </div>
              <UnitBalanceReport onSelectUnit={handleSelectUnit} dateRange={dateRange} />
            </>
          )}
        </TabsContent>

        <TabsContent value="charges" className="mt-6">
          <ChargeDebtReport dateRange={dateRange} onDateRangeChange={setDateRange} />
        </TabsContent>

        <TabsContent value="chronological" className="mt-6">
          <ChronologicalReport dateRange={dateRange} onDateRangeChange={setDateRange} />
        </TabsContent>

        <TabsContent value="managers" className="mt-6">
          <ManagersHistoryReport />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
