import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, Megaphone, Wrench, Users, FileText } from "lucide-react";

const actions = [
  { id: 1, label: "ثبت هزینه جدید", icon: Receipt, color: "bg-primary" },
  { id: 2, label: "اعلان جدید", icon: Megaphone, color: "bg-accent" },
  { id: 3, label: "درخواست تعمیرات", icon: Wrench, color: "bg-warning" },
  { id: 4, label: "افزودن ساکن", icon: Users, color: "bg-success" },
  { id: 5, label: "صورتحساب", icon: FileText, color: "bg-primary" },
];

export function QuickActions() {
  return (
    <Card variant="elevated" className="animate-fade-in opacity-0" style={{ animationDelay: "600ms" }}>
      <CardHeader>
        <CardTitle>دسترسی سریع</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 hover:bg-muted/50"
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            );
          })}
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 border-dashed hover:bg-muted/50"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">سایر</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
