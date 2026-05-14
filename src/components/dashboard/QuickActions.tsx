import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, CreditCard, FileText, Settings, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  onTabChange: (tab: string) => void;
}

type Action = {
  id: string;
  label: string;
  icon: any;
  color: string;
  shortcut?: string;
  href?: string;
};

const actions: Action[] = [
  { id: "expenses", label: "ثبت هزینه", icon: Receipt, color: "bg-primary", shortcut: "E" },
  { id: "payments", label: "ثبت پرداخت", icon: CreditCard, color: "bg-accent", shortcut: "P" },
  { id: "units", label: "واحدها", icon: Building2, color: "bg-warning", shortcut: "U" },
  { id: "reports", label: "گزارش‌ها", icon: FileText, color: "bg-success", shortcut: "R" },
  { id: "settings", label: "تنظیمات", icon: Settings, color: "bg-muted-foreground", shortcut: "S" },
];

export function QuickActions({ onTabChange }: QuickActionsProps) {
  const navigate = useNavigate();
  return (
    <Card variant="elevated" className="animate-fade-in opacity-0" style={{ animationDelay: "600ms" }}>
      <CardHeader>
        <CardTitle>دسترسی سریع</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 hover:bg-muted/50 relative group"
                onClick={() => action.href ? navigate(action.href) : onTabChange(action.id)}
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                {action.shortcut && (
                  <span className="absolute top-2 left-2 text-xs text-muted-foreground border border-border rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.shortcut}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
