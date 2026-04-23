import { ChargeSettings } from "@/components/settings/ChargeSettings";
import { ChargeHistory } from "./ChargeHistory";
import { LatePenaltyApplier } from "./LatePenaltyApplier";
import { CustomDebtForm } from "./CustomDebtForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertTriangle, FilePlus, History } from "lucide-react";

export function ChargesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">شارژ واحدها</h1>
        <p className="text-muted-foreground mt-1">
          تنظیم مبالغ شارژ و فوق‌شارژ و اعمال برای واحدها
        </p>
      </div>

      <Tabs defaultValue="settings" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            اعمال شارژ
          </TabsTrigger>
          <TabsTrigger value="penalty" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            جریمه دیرکرد
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <FilePlus className="w-4 h-4" />
            بدهی دستی
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            سوابق
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <ChargeSettings />
        </TabsContent>
        <TabsContent value="penalty" className="mt-4">
          <LatePenaltyApplier />
        </TabsContent>
        <TabsContent value="custom" className="mt-4">
          <CustomDebtForm />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ChargeHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
