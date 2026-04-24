import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCog, Phone, Mail, Calendar, History, Clock } from "lucide-react";
import { useManagers, Manager } from "@/hooks/useManagers";
import { useManagerRoles } from "@/hooks/useManagerRoles";
import { formatJalaliDate } from "@/lib/jalaliDate";

const tenureDays = (m: Manager) => {
  const start = new Date(m.start_date);
  const endStr = m.end_date && m.end_date <= new Date().toISOString().split("T")[0]
    ? m.end_date
    : new Date().toISOString().split("T")[0];
  const end = new Date(endStr);
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff) + 1;
};

const isActiveManager = (manager: Manager) => {
  if (!manager.is_active) return false;
  const today = new Date().toISOString().split("T")[0];
  const startOk = manager.start_date <= today;
  const endOk = !manager.end_date || manager.end_date >= today;
  return startOk && endOk;
};

const personLabel = (m: Manager) =>
  m.role_type === "external"
    ? m.external_name || "مدیر خارجی"
    : `واحد ${m.unit?.unit_number ?? "-"}`;

const personName = (m: Manager) => {
  if (m.role_type === "external") return m.external_name || "—";
  if (m.role_type === "owner") return m.unit?.owner_name || "—";
  return m.unit?.resident_name || m.unit?.owner_name || "—";
};

const personPhone = (m: Manager) =>
  m.mobile ||
  (m.role_type === "owner"
    ? m.unit?.phone
    : m.unit?.resident_phone || m.unit?.phone) ||
  "—";

function ManagerRow({ manager, isPast }: { manager: Manager; isPast: boolean }) {
  return (
    <div
      className={`p-4 border rounded-lg ${
        !isPast ? "border-primary bg-primary/5" : "bg-muted/30"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{personLabel(manager)}</span>
            <span className="text-sm text-muted-foreground">— {personName(manager)}</span>
            <Badge
              variant={
                manager.role_type === "owner"
                  ? "default"
                  : manager.role_type === "external"
                  ? "outline"
                  : "secondary"
              }
            >
              {manager.role_type === "owner"
                ? "مالک"
                : manager.role_type === "external"
                ? "خارج از ساختمان"
                : "ساکن"}
            </Badge>
            {!isPast ? (
              <Badge variant="outline" className="text-primary border-primary">
                فعال
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                پایان‌یافته
              </Badge>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm md:min-w-[520px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0" />
            <span dir="ltr">{personPhone(manager)}</span>
          </div>
          {manager.email ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              <span dir="ltr" className="truncate">{manager.email}</span>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>
              از {formatJalaliDate(manager.start_date)}
              {manager.end_date
                ? ` تا ${formatJalaliDate(manager.end_date)}`
                : !isPast
                ? " تا کنون"
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground md:col-span-3">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              مدت تصدی: {tenureDays(manager).toLocaleString("fa-IR")} روز
              {!isPast && !manager.end_date ? " (در حال ادامه)" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ManagersHistoryReport({ buildingId }: { buildingId?: string } = {}) {
  const { data: managers = [], isLoading } = useManagers(buildingId);
  const { data: roles = [], isLoading: rolesLoading } = useManagerRoles(buildingId);

  if (isLoading || rolesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const managersByRole = (roleId: string) =>
    managers.filter((m) => m.role_id === roleId);
  const unassignedManagers = managers.filter((m) => !m.role_id);

  return (
    <div className="space-y-4">
      {roles.map((role) => {
        const inRole = managersByRole(role.id);
        const active = inRole.find(isActiveManager) || null;
        const past = inRole
          .filter((m) => !isActiveManager(m))
          .sort((a, b) => {
            const aEnd = a.end_date || a.start_date;
            const bEnd = b.end_date || b.start_date;
            return bEnd.localeCompare(aEnd);
          });

        return (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="w-4 h-4 text-primary" />
                {role.label}
                {active ? (
                  <Badge variant="outline" className="text-primary border-primary">
                    دارای مدیر فعال
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    خالی
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground mr-auto">
                  مجموع: {inRole.length.toLocaleString("fa-IR")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active && <ManagerRow manager={active} isPast={false} />}

              {past.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
                    <History className="w-3.5 h-3.5" />
                    سوابق ({past.length.toLocaleString("fa-IR")})
                  </h4>
                  <div className="space-y-2">
                    {past.map((m) => (
                      <ManagerRow key={m.id} manager={m} isPast={true} />
                    ))}
                  </div>
                </div>
              )}

              {!active && past.length === 0 && (
                <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                  هیچ مدیری برای این نقش ثبت نشده است
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {unassignedManagers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              بدون نقش مشخص
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unassignedManagers.map((m) => (
              <ManagerRow key={m.id} manager={m} isPast={!isActiveManager(m)} />
            ))}
          </CardContent>
        </Card>
      )}

      {managers.length === 0 && (
        <Card>
          <CardContent className="text-center text-muted-foreground py-8">
            هنوز مدیری ثبت نشده است
          </CardContent>
        </Card>
      )}
    </div>
  );
}
