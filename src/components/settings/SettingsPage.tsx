import { Building2, Users, CreditCard, Tags, Landmark, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySettings } from "./CategorySettings";
import { ManagerSettings } from "./ManagerSettings";
import { BuildingSettings } from "./BuildingSettings";
import { PaymentPolicySettings } from "./PaymentPolicySettings";
import { BankAccountSettings } from "./BankAccountSettings";
import { SmsManagementPage } from "@/components/sms/SmsManagementPage";

export function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-muted-foreground mt-1">مدیریت ساختمان‌ها، مدیران، سیاست‌های مالی، حساب بانکی، دسته‌بندی‌ها و پیامک</p>
      </div>

      <Tabs defaultValue="building" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="building" className="flex items-center justify-center gap-1.5 py-2.5 px-2 min-w-0 text-xs whitespace-normal text-center leading-tight">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">ساختمان</span>
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center justify-center gap-1.5 py-2.5 px-2 min-w-0 text-xs whitespace-normal text-center leading-tight">
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">مدیران</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center justify-center gap-1.5 py-2.5 px-2 min-w-0 text-xs whitespace-normal text-center leading-tight">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="truncate">سیاست مالی</span>
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center justify-center gap-1.5 py-2.5 px-2 min-w-0 text-xs whitespace-normal text-center leading-tight">
            <Landmark className="w-4 h-4 shrink-0" />
            <span className="truncate">حساب بانکی</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center justify-center gap-1.5 py-2.5 px-2 min-w-0 text-xs whitespace-normal text-center leading-tight">
            <Tags className="w-4 h-4 shrink-0" />
            <span className="truncate">دسته‌بندی</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center justify-center gap-1.5 py-2.5 px-2 min-w-0 text-xs whitespace-normal text-center leading-tight">
            <Send className="w-4 h-4 shrink-0" />
            <span className="truncate">پیامک</span>
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

        <TabsContent value="bank" className="mt-6">
          <BankAccountSettings />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategorySettings />
        </TabsContent>

        <TabsContent value="sms" className="mt-6">
          <SmsManagementPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
