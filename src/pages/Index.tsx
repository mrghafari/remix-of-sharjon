import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ExpensesPage } from "@/components/expenses/ExpensesPage";
import { UnitsPage } from "@/components/units/UnitsPage";
import { PaymentsPage } from "@/components/payments/PaymentsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ReportsPage } from "@/components/reports/ReportsPage";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onTabChange={setActiveTab} />;
      case "units":
        return <UnitsPage />;
      case "expenses":
        return <ExpensesPage />;
      case "payments":
        return <PaymentsPage />;
      case "settings":
        return <SettingsPage />;
      case "reports":
        return <ReportsPage />;
      default:
        return (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center animate-fade-in">
              <h2 className="text-2xl font-bold text-muted-foreground mb-2">
                بخش {activeTab === "residents" ? "ساکنین" :
                      activeTab === "payments" ? "پرداخت‌ها" :
                      activeTab === "reports" ? "گزارش‌ها" :
                      activeTab === "announcements" ? "اعلانات" :
                      "تنظیمات"}
              </h2>
              <p className="text-muted-foreground">این بخش به زودی فعال می‌شود...</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mr-64 transition-all duration-300">
        <Header />
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
