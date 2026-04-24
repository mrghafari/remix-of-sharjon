import { Bell, MessageSquare, BarChart3, CalendarCheck, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotifications, markNotificationRead } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NotificationBellProps {
  buildingId?: string;
  isManager?: boolean;
  /** Called with target tab name when an item is clicked */
  onNavigate?: (tab: string) => void;
}

export function NotificationBell({ buildingId, isManager = false, onNavigate }: NotificationBellProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { announcements, polls, reservations, messagesUnread, total } = useNotifications(buildingId, isManager);

  const handleNavigate = async (
    tab: string,
    type?: "announcement" | "poll" | "reservation",
    id?: string
  ) => {
    if (type && id && buildingId && user?.id) {
      await markNotificationRead(buildingId, user.id, type, id);
    }
    setOpen(false);
    onNavigate?.(tab);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {total > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {total > 99 ? "99+" : total.toLocaleString("fa-IR")}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" dir="rtl">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="font-bold text-sm">اعلانات</span>
          {total > 0 && <Badge variant="secondary">{total.toLocaleString("fa-IR")} جدید</Badge>}
        </div>
        <ScrollArea className="max-h-[70vh]">
          <div className="divide-y">
            {/* Messages */}
            {messagesUnread > 0 && (
              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-right"
                onClick={() => handleNavigate("messages")}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{messagesUnread.toLocaleString("fa-IR")} پیام جدید</div>
                  <div className="text-xs text-muted-foreground">برای مشاهده کلیک کنید</div>
                </div>
                <Badge>{messagesUnread.toLocaleString("fa-IR")}</Badge>
              </button>
            )}

            {/* Pending reservations (manager) */}
            {isManager && reservations.items.length > 0 &&
              reservations.items.map((r: any) => (
                <button
                  key={`res-${r.id}`}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-right"
                  onClick={() => handleNavigate("announcements")}
                >
                  <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">رزرو در انتظار: {r.requester_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(r.reservation_date), "d MMMM", { locale: faIR })} • {r.start_time?.slice(0, 5)}-{r.end_time?.slice(0, 5)}
                    </div>
                  </div>
                </button>
              ))}

            {/* Resident reservation status changes */}
            {!isManager && (reservations.items as any[]).filter((r) => !r.isRead).map((r) => (
              <button
                key={`resi-${r.id}`}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-right"
                onClick={() => handleNavigate("reservations", "reservation", r.id)}
              >
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", r.status === "approved" ? "bg-success/10" : "bg-destructive/10")}>
                  <CalendarCheck className={cn("w-4 h-4", r.status === "approved" ? "text-success" : "text-destructive")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">رزرو شما {r.status === "approved" ? "تایید" : "رد"} شد</div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(r.reservation_date), "d MMMM", { locale: faIR })} • {r.start_time?.slice(0, 5)}
                  </div>
                </div>
              </button>
            ))}

            {/* Announcements */}
            {(announcements.items as any[]).filter((a) => !a.isRead).map((a) => (
              <button
                key={`ann-${a.id}`}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-right"
                onClick={() => handleNavigate("announcements", "announcement", a.id)}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{a.content}</div>
                </div>
              </button>
            ))}

            {/* Polls (resident only — manager doesn't vote) */}
            {!isManager && (polls.items as any[]).filter((p) => !p.voted).map((p) => (
              <button
                key={`poll-${p.id}`}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-right"
                onClick={() => handleNavigate("polls")}
              >
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">نظرسنجی جدید</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{p.question}</div>
                </div>
              </button>
            ))}

            {total === 0 && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                اعلان جدیدی ندارید
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
