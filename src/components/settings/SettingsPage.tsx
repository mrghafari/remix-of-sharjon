import { Building2, Users, CreditCard, Tags } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySettings } from "./CategorySettings";
import { ManagerSettings } from "./ManagerSettings";
import { BuildingSettings } from "./BuildingSettings";
import { PaymentPolicySettings } from "./PaymentPolicySettings";

export function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-muted-foreground mt-1">مدیریت ساختمان‌ها، مدیران، سیاست‌های مالی و دسته‌بندی‌ها</p>
      </div>

      <Tabs defaultValue="building" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="building" className="flex items-center gap-2 py-2.5">
            <Building2 className="w-4 h-4" />
            <span>ساختمان</span>
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center gap-2 py-2.5">
            <Users className="w-4 h-4" />
            <span>مدیران</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2 py-2.5">
            <CreditCard className="w-4 h-4" />
            <span>سیاست‌های مالی</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 py-2.5">
            <Tags className="w-4 h-4" />
            <span>دسته‌بندی هزینه‌ها</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="building" className="mt-6">
          <BuildingSettings />
        </TabsContent>

        <TabsContent value="managers" className="mt-6">
          <ManagerSettings />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <PaymentPolicySettings />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategorySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
