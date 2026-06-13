import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video } from "lucide-react";
import { useBuilding } from "@/contexts/BuildingContext";
import { MeetingMinutesPage } from "./MeetingMinutesPage";
import { OnlineMeetingsPage } from "./OnlineMeetingsPage";

interface Props {
  buildingId?: string;
  canEdit?: boolean;
  residentContext?: {
    unitId: string;
    role: "owner" | "resident";
    personName?: string;
    personPhone?: string;
  };
}

export function MeetingsPage({ buildingId: propBuildingId, canEdit = true, residentContext }: Props) {
  const { currentBuildingId } = useBuilding();
  const buildingId = propBuildingId || currentBuildingId;

  if (!buildingId) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">جلسات</h1>
        <p className="text-muted-foreground text-sm mt-1">صورتجلسات و جلسات آنلاین ساختمان</p>
      </div>

      <Tabs defaultValue="minutes" dir="rtl">
        <TabsList>
          <TabsTrigger value="minutes" className="gap-2">
            <FileText className="w-4 h-4" />
            صورتجلسات
          </TabsTrigger>
          <TabsTrigger value="online" className="gap-2">
            <Video className="w-4 h-4" />
            جلسه
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minutes" className="mt-4">
          <MeetingMinutesPage buildingId={buildingId} canEdit={canEdit} residentContext={residentContext} />
        </TabsContent>

        <TabsContent value="online" className="mt-4">
          <OnlineMeetingsPage buildingId={buildingId} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
