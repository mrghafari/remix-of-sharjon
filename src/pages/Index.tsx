import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/components/dashboard/Dashboard";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="mr-64 transition-all duration-300">
        <Header />
        <div className="p-6">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab !== "dashboard" && (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center animate-fade-in">
                <h2 className="text-2xl font-bold text-muted-foreground mb-2">
                  بخش {activeTab === "units" ? "واحدها" : 
                        activeTab === "residents" ? "ساکنین" :
                        activeTab === "payments" ? "پرداخت‌ها" :
                        activeTab === "reports" ? "گزارش‌ها" :
                        activeTab === "announcements" ? "اعلانات" :
                        "تنظیمات"}
                </h2>
                <p className="text-muted-foreground">این بخش به زودی فعال می‌شود...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
