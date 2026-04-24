import { Building2, Home, Users, CreditCard, Settings, FileText, Bell, ChevronLeft, ChevronRight, Receipt, FolderOpen, Gauge, BookUser, Zap, FolderKanban, MessageSquare, LifeBuoy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useBuilding } from "@/contexts/BuildingContext";
import { useUnreadTicketsCount } from "@/hooks/useSupportTickets";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const menuItems = [
  { id: "dashboard", label: "داشبورد", icon: Home },
  { id: "units", label: "واحدها", icon: Building2 },
  { id: "expenses", label: "هزینه‌ها", icon: Receipt },
  { id: "projects", label: "مدیریت پروژه", icon: FolderKanban },
  { id: "payments", label: "پرداخت‌ها", icon: CreditCard },
  { id: "charges", label: "شارژ / بدهی", icon: Zap },
  { id: "reports", label: "گزارش‌ها", icon: FileText },
  { id: "announcements", label: "اعلانات", icon: Bell },
  { id: "messages", label: "پیام‌ها", icon: MessageSquare },
  { id: "documents", label: "اسناد ساختمان", icon: FolderOpen },
  { id: "utilities", label: "مصارف", icon: Gauge },
  { id: "phonebook", label: "دفترچه تلفن", icon: BookUser },
  { id: "tickets", label: "پشتیبانی", icon: LifeBuoy },
  { id: "settings", label: "تنظیمات", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange, mobileOpen = false, onMobileOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { currentBuilding } = useBuilding();
  const { data: ticketUnread = 0 } = useUnreadTicketsCount({ buildingId: currentBuilding?.id });
  const isMobile = useIsMobile();

  // On mobile, ignore collapsed mode
  const showLabels = isMobile ? true : !collapsed;

  const handleItemClick = (id: string) => {
    onTabChange(id);
    if (isMobile) onMobileOpenChange?.(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      <aside
        className={cn(
          "fixed right-0 top-0 h-screen bg-sidebar text-sidebar-foreground transition-transform duration-300 z-50 flex flex-col",
          // Desktop width
          !isMobile && (collapsed ? "w-20" : "w-64"),
          // Mobile width and slide
          isMobile && "w-64",
          isMobile && !mobileOpen && "translate-x-full",
          isMobile && mobileOpen && "translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {showLabels && (
            <div className="animate-fade-in overflow-hidden flex-1">
              <h1 className="font-bold text-sm leading-tight">مدیریت ساختمان</h1>
              <p className="text-[10px] text-sidebar-foreground/60">پنل مدیریت</p>
            </div>
          )}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground"
              onClick={() => onMobileOpenChange?.(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 relative",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {showLabels && <span className="text-xs font-medium flex-1 text-right">{item.label}</span>}
                {item.id === "tickets" && ticketUnread > 0 && (
                  <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-destructive text-destructive-foreground">
                    {ticketUnread}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse Button - desktop only */}
        {!isMobile && (
          <div className="p-2 border-t border-sidebar-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full hover:bg-sidebar-accent text-sidebar-foreground"
            >
              {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
