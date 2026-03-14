import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ExpensesPage } from "@/components/expenses/ExpensesPage";
import { UnitsPage } from "@/components/units/UnitsPage";
import { PaymentsPage } from "@/components/payments/PaymentsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { BuildingDocuments } from "@/components/documents/BuildingDocuments";
import { AnnouncementsPage } from "@/components/announcements/AnnouncementsPage";
import { UtilitiesPage } from "@/components/utilities/UtilitiesPage";

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
      case "documents":
        return (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">اسناد ساختمان</h1>
              <p className="text-muted-foreground mt-1">مدیریت فایل‌ها و اسناد ساختمان</p>
            </div>
            <BuildingDocuments />
          </div>
        );
      case "announcements":
        return <AnnouncementsPage />;
      case "utilities":
        return <UtilitiesPage />;
      default:
        return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mr-64 transition-all duration-300">
        <Header onTabChange={setActiveTab} />
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
