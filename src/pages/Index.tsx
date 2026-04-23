import { useState } from "react";
import { Building2, Plus, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { ExpensesPage } from "@/components/expenses/ExpensesPage";
import { UnitsPage } from "@/components/units/UnitsPage";
import { PaymentsPage } from "@/components/payments/PaymentsPage";
import { ChargesPage } from "@/components/charges/ChargesPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { ProjectSettings } from "@/components/projects/ProjectSettings";
import { BuildingDocuments } from "@/components/documents/BuildingDocuments";
import { AnnouncementsPage } from "@/components/announcements/AnnouncementsPage";
import { UtilitiesPage } from "@/components/utilities/UtilitiesPage";
import { PhoneBookPage } from "@/components/phonebook/PhoneBookPage";
import { useBuilding, useCreateBuilding } from "@/contexts/BuildingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function CreateBuildingScreen() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const createBuilding = useCreateBuilding();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createBuilding.mutate({
      name: name.trim(),
      address: address.trim() || undefined,
      total_units: totalUnits ? parseInt(totalUnits) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">خوش آمدید!</h1>
          <p className="text-muted-foreground">
            برای شروع، اولین ساختمان خود را ایجاد کنید
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              ایجاد ساختمان جدید
            </CardTitle>
            <CardDescription>اطلاعات ساختمان را وارد کنید</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">نام ساختمان *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مجتمع مسکونی گلستان"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">آدرس</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="units">تعداد واحدها</Label>
                <Input
                  id="units"
                  type="number"
                  min="1"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
                disabled={createBuilding.isPending || !name.trim()}
              >
                {createBuilding.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                ایجاد ساختمان و شروع مدیریت
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { buildings, isLoading } = useBuilding();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (buildings.length === 0) {
    return <CreateBuildingScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onTabChange={setActiveTab} />;
      case "units":
        return <UnitsPage />;
      case "expenses":
        return <ExpensesPage />;
      case "projects":
        return (
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold">مدیریت پروژه</h1>
              <p className="text-muted-foreground mt-1">پروژه‌های عمرانی و تعمیراتی ساختمان</p>
            </div>
            <ProjectSettings />
          </div>
        );
      case "payments":
        return <PaymentsPage />;
      case "charges":
        return <ChargesPage />;
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
      case "phonebook":
        return <PhoneBookPage />;
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
