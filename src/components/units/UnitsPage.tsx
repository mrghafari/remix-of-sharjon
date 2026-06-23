import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Building2, History, List, KeyRound, Home } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UnitForm } from "./UnitForm";
import { UnitsList } from "./UnitsList";
import { UnitsStats } from "./UnitsStats";
import { OccupancyHistoryPage } from "./OccupancyHistoryPage";
import { UnitModuleAccessManager } from "./UnitModuleAccessManager";
import { ListingsManagerPage } from "@/components/listings/ListingsManagerPage";
import type { Unit } from "@/hooks/useUnits";

export function UnitsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [tab, setTab] = useState("list");

  const handleEdit = (unit: Unit) => {
    setEditUnit(unit);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditUnit(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Building2 className="w-7 h-7 text-primary" />
            مدیریت واحدها
          </h1>
          <p className="text-muted-foreground mt-1">
            ثبت و مدیریت اطلاعات واحدهای ساختمان
          </p>
        </div>
        {tab === "list" && !showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            ثبت واحد جدید
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            لیست واحدها
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            تاریخچه افراد
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-2">
            <KeyRound className="w-4 h-4" />
            دسترسی‌ها
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-6">
          <UnitsStats />
          {showForm && <UnitForm onClose={handleClose} editUnit={editUnit} />}
          <UnitsList onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <OccupancyHistoryPage embedded />
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <UnitModuleAccessManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
