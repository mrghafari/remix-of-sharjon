import { Fragment, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Search, KeyRound } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useBuilding } from "@/contexts/BuildingContext";
import {
  useUnitModuleAccessRows,
  useToggleUnitModuleAccess,
  MODULES,
  type ModulePersonType,
  type ModuleKey,
} from "@/hooks/useUnitModuleAccess";

export function UnitModuleAccessManager() {
  const { currentBuildingId } = useBuilding();
  const { data: units = [] } = useUnits();
  const { data: rows = [] } = useUnitModuleAccessRows(currentBuildingId || undefined);
  const toggle = useToggleUnitModuleAccess();
  const [search, setSearch] = useState("");

  const isGranted = (unitId: string, person: ModulePersonType, moduleKey: ModuleKey) =>
    rows.some(r => r.unit_id === unitId && r.module_key === moduleKey &&
      (r.person_type === person || r.person_type === "both"));

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return units;
    return units.filter(u =>
      u.unit_number.includes(q) ||
      (u.owner_name || "").includes(q) ||
      (u.resident_name || "").includes(q)
    );
  }, [units, search]);

  const handleToggle = (unitId: string, person: ModulePersonType, moduleKey: ModuleKey, currentlyGranted: boolean) => {
    if (!currentBuildingId) return;
    toggle.mutate({
      buildingId: currentBuildingId,
      unitId,
      personType: person,
      moduleKey,
      granted: !currentlyGranted,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          دسترسی واحدها به اطلاعات ساختمان
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          با فعال کردن هر سوئیچ، مالک یا ساکن آن واحد می‌تواند بخش مربوطه را در پنل کاربری خود ببیند.
          این دسترسی‌ها به‌طور پیش‌فرض غیرفعال هستند.
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو بر اساس شماره واحد، نام مالک یا ساکن..."
            className="pr-9"
          />
        </div>
        <div className="border rounded-lg max-h-[600px] overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                <th rowSpan={2} className="sticky right-0 z-20 bg-muted border-b border-l p-2 text-right font-medium min-w-[110px]">
                  واحد
                </th>
                {MODULES.map(m => (
                  <th key={m.key} colSpan={2} className="border-b border-l p-1.5 text-center font-medium whitespace-nowrap">
                    {m.label}
                  </th>
                ))}
              </tr>
              <tr>
                {MODULES.map(m => (
                  <Fragment key={m.key}>
                    <th className="border-b border-l p-1 text-center font-normal text-[10px] text-muted-foreground bg-muted/70">مالک</th>
                    <th className="border-b border-l p-1 text-center font-normal text-[10px] text-muted-foreground bg-muted/70">ساکن</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-muted/40">
                  <td className="sticky right-0 z-10 bg-card border-b border-l p-2 font-medium whitespace-nowrap">
                    <div>واحد {u.unit_number}</div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                      {u.owner_name || "—"}
                    </div>
                  </td>
                  {MODULES.map(m => {
                    const ownerGranted = isGranted(u.id, "owner", m.key);
                    const residentGranted = isGranted(u.id, "resident", m.key);
                    return (
                      <Fragment key={m.key}>
                        <td className="border-b border-l p-1 text-center">
                          <Switch
                            checked={ownerGranted}
                            onCheckedChange={() => handleToggle(u.id, "owner", m.key, ownerGranted)}
                            disabled={toggle.isPending}
                          />
                        </td>
                        <td className="border-b border-l p-1 text-center">
                          <Switch
                            checked={residentGranted}
                            onCheckedChange={() => handleToggle(u.id, "resident", m.key, residentGranted)}
                            disabled={toggle.isPending}
                          />
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={1 + MODULES.length * 2} className="text-center text-sm text-muted-foreground py-6">
                    واحدی یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
