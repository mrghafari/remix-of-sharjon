import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin, useAdminStats } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Building2, BarChart3, Loader2, LogOut } from "lucide-react";
import { AdminStatsCards } from "@/components/admin/AdminStats";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminBuildings } from "@/components/admin/AdminBuildings";

export default function Admin() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: isSuperAdmin, isPending: rolePending } = useIsSuperAdmin(user?.id);
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  if (authLoading || rolePending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold">پنل مدیریت پلتفرم</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 ml-1" />
            خروج
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <Tabs defaultValue="stats" dir="rtl">
          <TabsList className="mb-6">
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              آمار کلی
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2">
              <Users className="h-4 w-4" />
              مشتریان
            </TabsTrigger>
            <TabsTrigger value="buildings" className="gap-2">
              <Building2 className="h-4 w-4" />
              ساختمان‌ها
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <AdminStatsCards stats={stats} isLoading={statsLoading} />
          </TabsContent>

          <TabsContent value="customers">
            <AdminCustomers />
          </TabsContent>

          <TabsContent value="buildings">
            <AdminBuildings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
