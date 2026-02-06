import { CategorySettings } from "./CategorySettings";

export function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <p className="text-muted-foreground mt-1">مدیریت دسته‌بندی‌ها و نحوه تسهیم هزینه‌ها</p>
      </div>
      
      <CategorySettings />
    </div>
  );
}
