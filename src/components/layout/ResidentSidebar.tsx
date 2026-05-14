import { Building2, Wallet, Bell, BarChart3, FileText, Phone, ChevronLeft, ChevronRight, LogOut, UserCog, CalendarCheck, MessageSquare, ScrollText, X, Repeat, FolderKanban, Receipt, PiggyBank } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ModuleKey } from "@/hooks/useUnitModuleAccess";


interface ResidentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  buildingName: string;
  unitNumber: string;
  role: string;
  personName: string;
  onSignOut: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  grantedModules?: ModuleKey[];
}

const baseMenuItems = [
  { id: "finance", label: "وضعیت مالی", icon: Wallet },
  { id: "projects", label: "هزینه‌های پروژه‌ای", icon: FolderKanban },
  { id: "messages", label: "پیام به مدیر", icon: MessageSquare },
  { id: "announcements", label: "اطلاعیه‌ها", icon: Bell },
  { id: "polls", label: "نظرسنجی", icon: BarChart3 },
  { id: "reservations", label: "رزرو امکانات", icon: CalendarCheck },
  { id: "managers", label: "سوابق مدیران", icon: UserCog },
  { id: "documents", label: "اسناد", icon: FileText },
  { id: "contacts", label: "دفترچه تلفن", icon: Phone },
  { id: "meetings", label: "صورتجلسات", icon: ScrollText },
];

const optionalItems: { id: string; label: string; icon: any; module: ModuleKey }[] = [
  { id: "all_expenses", label: "همه هزینه‌های ساختمان", icon: Receipt, module: "all_expenses" },
  { id: "fund_balances", label: "موجودی صندوق‌ها", icon: PiggyBank, module: "fund_balances" },
];

export function ResidentSidebar({
  activeTab,
  onTabChange,
  buildingName,
  unitNumber,
  role,
  personName,
  onSignOut,
  mobileOpen = false,
  onMobileOpenChange,
  grantedModules = [],
}: ResidentSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const showLabels = isMobile ? true : !collapsed;
  const menuItems = [
    ...baseMenuItems,
    ...optionalItems.filter(i => grantedModules.includes(i.module)),
  ];

  const handleItemClick = (id: string) => {
    onTabChange(id);
    if (isMobile) onMobileOpenChange?.(false);
  };

  return (
    <>
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      <aside
        className={cn(
          "fixed right-0 top-0 h-screen bg-sidebar text-sidebar-foreground transition-transform duration-300 z-50 flex flex-col",
          !isMobile && (collapsed ? "w-20" : "w-64"),
          isMobile && "w-64",
          isMobile && !mobileOpen && "translate-x-full",
          isMobile && mobileOpen && "translate-x-0"
        )}
      >
        {/* Logo / Building info */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {showLabels && (
            <div className="animate-fade-in overflow-hidden flex-1">
              <h1 className="font-bold text-sm leading-tight truncate">{buildingName}</h1>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                واحد {unitNumber} • {role === "owner" ? "مالک" : "ساکن"}: {personName}
              </p>
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
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {showLabels && <span className="text-xs font-medium flex-1 text-right">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sign out & Collapse */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <SwitchAccountButton showLabels={showLabels} />
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {showLabels && <span className="text-xs font-medium flex-1 text-right">خروج</span>}
          </button>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full hover:bg-sidebar-accent text-sidebar-foreground"
            >
              {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}

function SwitchAccountButton({ showLabels }: { showLabels: boolean }) {
  const navigate = useNavigate();
  const hasMultiple = (() => {
    try {
      const all = JSON.parse(localStorage.getItem("resident_matches_all") || "[]");
      return Array.isArray(all) && all.length > 1;
    } catch { return false; }
  })();
  if (!hasMultiple) return null;
  return (
    <button
      onClick={() => navigate("/resident-auth")}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
    >
      <Repeat className="w-4 h-4 shrink-0" />
      {showLabels && <span className="text-xs font-medium flex-1 text-right">تغییر نقش / ساختمان</span>}
    </button>
  );
}
