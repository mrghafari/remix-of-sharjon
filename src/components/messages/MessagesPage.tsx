import { MessageSquare } from "lucide-react";
import { MessagesPanel } from "./MessagesPanel";
import { useBuilding } from "@/contexts/BuildingContext";
import { useAuth } from "@/hooks/useAuth";

export function MessagesPage() {
  const { currentBuildingId } = useBuilding();
  const { user } = useAuth();
  const senderName =
    (user?.user_metadata?.full_name as string) ||
    (user?.email || "").replace(/@resident\.local$/i, "") ||
    "مدیر";

  if (!currentBuildingId) return null;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">پیام‌ها</h1>
          <p className="text-muted-foreground text-sm">گفتگو با ساکنین و پاسخ به پیام‌ها</p>
        </div>
      </div>
      <MessagesPanel buildingId={currentBuildingId} senderName={senderName} senderRole="manager" />
    </div>
  );
}
