import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BarChart3, CalendarCheck } from "lucide-react";
import { AnnouncementsList } from "./AnnouncementsList";
import { PollsList } from "./PollsList";
import { ReservationsList } from "./ReservationsList";

export function AnnouncementsPage() {
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">اعلانات و نظرسنجی</h1>
        <p className="text-muted-foreground mt-1">مدیریت اطلاعیه‌ها، رأی‌گیری و رزرو امکانات ساختمان</p>
      </div>
      <Tabs defaultValue="announcements" dir="rtl">
        <TabsList className="mb-4">
          <TabsTrigger value="announcements" className="gap-2">
            <Bell className="w-4 h-4" />
            اعلانات
          </TabsTrigger>
          <TabsTrigger value="polls" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            نظرسنجی
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-2">
            <CalendarCheck className="w-4 h-4" />
            رزرو
          </TabsTrigger>
        </TabsList>
        <TabsContent value="announcements">
          <AnnouncementsList />
        </TabsContent>
        <TabsContent value="polls">
          <PollsList />
        </TabsContent>
        <TabsContent value="reservations">
          <ReservationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
