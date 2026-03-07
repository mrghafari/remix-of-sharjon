import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Home, Ban, Crown, Shield } from "lucide-react";
import type { AdminStats } from "@/hooks/useAdmin";

interface Props {
  stats: AdminStats | undefined;
  isLoading: boolean;
}

export function AdminStatsCards({ stats, isLoading }: Props) {
  const statCards = [
    { title: "کل کاربران", value: stats?.total_users ?? 0, icon: Users, color: "text-primary" },
    { title: "کل ساختمان‌ها", value: stats?.total_buildings ?? 0, icon: Building2, color: "text-emerald-600" },
    { title: "کل واحدها", value: stats?.total_units ?? 0, icon: Home, color: "text-blue-600" },
    { title: "مسدود شده", value: stats?.blocked_users ?? 0, icon: Ban, color: "text-destructive" },
  ];

  const planCards = [
    { title: "رایگان", value: stats?.free_users ?? 0, icon: Users },
    { title: "حرفه‌ای", value: stats?.pro_users ?? 0, icon: Crown },
    { title: "سازمانی", value: stats?.enterprise_users ?? 0, icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="text-3xl font-bold mt-1">
                    {isLoading ? "..." : s.value.toLocaleString("fa-IR")}
                  </p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {planCards.map((p) => (
          <Card key={p.title}>
            <CardContent className="pt-6 text-center">
              <p.icon className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">{p.title}</p>
              <p className="text-2xl font-bold">
                {isLoading ? "..." : p.value.toLocaleString("fa-IR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
