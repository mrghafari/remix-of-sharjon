import { Building2, Wallet, Bell, BarChart3, FileText, Phone, ChevronLeft, ChevronRight, LogOut, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ResidentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  buildingName: string;
  unitNumber: string;
  role: string;
  personName: string;
  onSignOut: () => void;
}

const menuItems = [
  { id: "finance", label: "وضعیت مالی", icon: Wallet },
  { id: "announcements", label: "اطلاعیه‌ها", icon: Bell },
  { id: "polls", label: "نظرسنجی", icon: BarChart3 },
  { id: "managers", label: "سوابق مدیران", icon: UserCog },
  { id: "documents", label: "اسناد", icon: FileText },
  { id: "contacts", label: "دفترچه تلفن", icon: Phone },
];

export function ResidentSidebar({ activeTab, onTabChange, buildingName, unitNumber, role, personName, onSignOut }: ResidentSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo / Building info */}
        <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <h1 className="font-bold text-lg truncate">{buildingName}</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                واحد {unitNumber} • {role === "owner" ? "مالک" : "ساکن"}: {personName}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sign out & Collapse */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">خروج</span>}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full hover:bg-sidebar-accent text-sidebar-foreground"
          >
            {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}
