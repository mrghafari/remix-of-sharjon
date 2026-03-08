import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin } from "@/hooks/useAdmin";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { BuildingProvider } from "@/contexts/BuildingContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Shield } from "lucide-react";
import Index from "./Index";
import { useEffect } from "react";

export default function AdminBuildingView() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: isSuperAdmin, isPending: rolePending } = useIsSuperAdmin(user?.id);
  const navigate = useNavigate();

  // Force the building ID into localStorage so BuildingProvider picks it up
  useEffect(() => {
    if (buildingId) {
      localStorage.setItem("currentBuildingId", buildingId);
    }
  }, [buildingId]);

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
    <BuildingProvider>
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          <span>حالت مشاهده سوپر ادمین</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate("/admin")}
          className="gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به پنل ادمین
        </Button>
      </div>
      <Index />
    </BuildingProvider>
  );
}
