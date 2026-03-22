import { Building2, Home, Users, CreditCard, Settings, FileText, Bell, ChevronLeft, ChevronRight, Receipt, FolderOpen, Gauge, BookUser, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "داشبورد", icon: Home },
  { id: "units", label: "واحدها", icon: Building2 },
  { id: "expenses", label: "هزینه‌ها", icon: Receipt },
  { id: "payments", label: "پرداخت‌ها", icon: CreditCard },
  { id: "charges", label: "شارژ", icon: Zap },
  { id: "reports", label: "گزارش‌ها", icon: FileText },
  { id: "announcements", label: "اعلانات", icon: Bell },
  { id: "documents", label: "اسناد ساختمان", icon: FolderOpen },
  { id: "utilities", label: "مصارف", icon: Gauge },
  { id: "phonebook", label: "دفترچه تلفن", icon: BookUser },
  { id: "settings", label: "تنظیمات", icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-lg">مدیریت ساختمان</h1>
              <p className="text-xs text-sidebar-foreground/60">پنل مدیریت</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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

        {/* Collapse Button */}
        <div className="p-4 border-t border-sidebar-border">
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
