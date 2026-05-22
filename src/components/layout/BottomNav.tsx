import { Home, Building2, Receipt, CreditCard, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
}

const items = [
  { id: "dashboard", label: "داشبورد", icon: Home },
  { id: "units", label: "واحدها", icon: Building2 },
  { id: "expenses", label: "هزینه‌ها", icon: Receipt },
  { id: "payments", label: "پرداخت‌ها", icon: CreditCard },
];

export function BottomNav({ activeTab, onTabChange, onMenuClick }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          const active = activeTab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onTabChange(it.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{it.label}</span>
            </button>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">منو</span>
        </button>
      </div>
    </nav>
  );
}
