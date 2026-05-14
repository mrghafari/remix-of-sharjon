import { useMemo, useState } from "react";
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
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map(u => (
            <div key={u.id} className="p-3 rounded-lg border bg-card space-y-3">
              <div className="font-medium">واحد {u.unit_number}</div>

              {(["owner", "resident"] as ModulePersonType[]).map(person => (
                <div key={person} className="border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">
                      {person === "owner" ? "مالک" : "ساکن"}
                    </div>
                    <div className="text-xs truncate max-w-[60%] text-left">
                      {(person === "owner" ? u.owner_name : u.resident_name) || "—"}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {MODULES.map(m => {
                      const granted = isGranted(u.id, person, m.key);
                      return (
                        <div
                          key={m.key}
                          className="flex items-center justify-between gap-2 p-2 rounded border bg-background"
                        >
                          <span className="text-xs">{m.label}</span>
                          <Switch
                            checked={granted}
                            onCheckedChange={() => handleToggle(u.id, person, m.key, granted)}
                            disabled={toggle.isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-6">واحدی یافت نشد</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
