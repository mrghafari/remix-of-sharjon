import { CategorySettings } from "./CategorySettings";
import { ManagerSettings } from "./ManagerSettings";
import { BuildingSettings } from "./BuildingSettings";
import { PaymentPolicySettings } from "./PaymentPolicySettings";

export function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-muted-foreground mt-1">مدیریت ساختمان‌ها و دسته‌بندی‌ها</p>
      </div>
      
      <BuildingSettings />
      <ManagerSettings />
      <PaymentPolicySettings />
      <CategorySettings />
    </div>
  );
}
