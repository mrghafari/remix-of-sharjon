import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useResidentUnit } from "@/hooks/useResidentUnit";
import { ResidentSidebar } from "@/components/layout/ResidentSidebar";
import { ResidentFinance } from "@/components/resident/ResidentFinance";
import { ResidentAnnouncements } from "@/components/resident/ResidentAnnouncements";
import { ResidentPolls } from "@/components/resident/ResidentPolls";
import { ResidentDocuments } from "@/components/resident/ResidentDocuments";
import { ResidentContacts } from "@/components/resident/ResidentContacts";

const ResidentDashboard = () => {
  const [activeTab, setActiveTab] = useState("finance");
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const {
    currentBuilding,
    currentUnit,
    currentBuildingId,
    currentUnitId,
    isLoading,
    matches,
  } = useResidentUnit();

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("resident_matches");
      localStorage.removeItem("currentBuildingId");
      await signOut();
    } catch (err) {
      // Ignore — we'll redirect regardless
      console.warn("signOut ignored", err);
    }
    navigate("/resident-auth", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!currentBuildingId || !currentUnitId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">اطلاعات واحد شما یافت نشد</p>
          <Button onClick={handleSignOut}>بازگشت</Button>
        </div>
      </div>
    );
  }

  const currentMatch = matches[0];
  const personName = currentMatch?.role === "owner"
    ? currentUnit?.owner_name || ""
    : (currentUnit?.resident_name || currentUnit?.owner_name || "");

  const renderContent = () => {
    switch (activeTab) {
      case "finance":
        return <ResidentFinance buildingId={currentBuildingId} unitId={currentUnitId} />;
      case "announcements":
        return <ResidentAnnouncements buildingId={currentBuildingId} />;
      case "polls":
        return <ResidentPolls buildingId={currentBuildingId} />;
      case "documents":
        return <ResidentDocuments buildingId={currentBuildingId} />;
      case "contacts":
        return <ResidentContacts buildingId={currentBuildingId} />;
      default:
        return <ResidentFinance buildingId={currentBuildingId} unitId={currentUnitId} />;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <ResidentSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        buildingName={currentBuilding?.name || "ساختمان"}
        unitNumber={currentUnit?.unit_number || ""}
        role={currentMatch?.role || "resident"}
        personName={personName}
        onSignOut={handleSignOut}
      />
      <main className="mr-64 transition-all duration-300">
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default ResidentDashboard;
