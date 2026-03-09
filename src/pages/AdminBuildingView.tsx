import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin, useAdminCustomers } from "@/hooks/useAdmin";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { BuildingProvider } from "@/contexts/BuildingContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import Index from "./Index";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function useCustomerBuildingIds(userId: string | undefined) {
  return useQuery({
    queryKey: ["customer_building_ids", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("building_members")
        .select("building_id")
        .eq("user_id", userId)
        .eq("role", "manager");
      if (error) throw error;
      return data.map((d) => d.building_id);
    },
    enabled: !!userId,
  });
}

export default function AdminBuildingView() {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: isSuperAdmin, isPending: rolePending } = useIsSuperAdmin(user?.id);
  const { data: customers } = useAdminCustomers();
  const { data: buildingIds, isLoading: buildingIdsLoading } = useCustomerBuildingIds(userId);
  const navigate = useNavigate();

  const customer = useMemo(
    () => customers?.find((c) => c.user_id === userId),
    [customers, userId]
  );

  // Set first building of this customer in localStorage
  useEffect(() => {
    if (buildingIds && buildingIds.length > 0) {
      const saved = localStorage.getItem("currentBuildingId");
      if (!saved || !buildingIds.includes(saved)) {
        localStorage.setItem("currentBuildingId", buildingIds[0]);
      }
    }
  }, [buildingIds]);

  if (authLoading || rolePending || buildingIdsLoading) {
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
    <BuildingProvider filterBuildingIds={buildingIds}>
      <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4" />
          <span>
            حالت مشاهده سوپر ادمین — در حال مشاهده حساب{" "}
            <strong>{customer?.full_name || customer?.email || "مشتری"}</strong>
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/admin")}
          className="gap-1 border-amber-700 text-amber-950 hover:bg-amber-600"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به پنل ادمین
        </Button>
      </div>
      <Index />
    </BuildingProvider>
  );
}
