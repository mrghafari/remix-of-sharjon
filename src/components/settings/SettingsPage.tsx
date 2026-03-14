import { CategorySettings } from "./CategorySettings";
import { ManagerSettings } from "./ManagerSettings";
import { BuildingSettings } from "./BuildingSettings";
import { ChargeSettings } from "./ChargeSettings";
import { ProjectSettings } from "@/components/projects/ProjectSettings";

export function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-muted-foreground mt-1">مدیریت ساختمان‌ها، پروژه‌ها و دسته‌بندی‌ها</p>
      </div>
      
      <BuildingSettings />
      <ChargeSettings />
      <ManagerSettings />
      <ProjectSettings />
      <CategorySettings />
    </div>
  );
}
