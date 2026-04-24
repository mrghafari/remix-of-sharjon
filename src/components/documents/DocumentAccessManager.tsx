import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Search, ShieldCheck } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useUnitDocumentAccessBlocks, useToggleUnitDocumentAccess } from "@/hooks/useUnitDocumentAccess";
import { useBuilding } from "@/contexts/BuildingContext";

export function DocumentAccessManager() {
  const { currentBuildingId } = useBuilding();
  const { data: units = [] } = useUnits();
  const { data: blocks = [] } = useUnitDocumentAccessBlocks(currentBuildingId || undefined);
  const toggle = useToggleUnitDocumentAccess();
  const [search, setSearch] = useState("");

  const blockedSet = useMemo(() => new Set(blocks.map(b => b.unit_id)), [blocks]);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return units;
    return units.filter(u =>
      u.unit_number.includes(q) ||
      (u.owner_name || "").includes(q) ||
      (u.resident_name || "").includes(q)
    );
  }, [units, search]);

  const handleToggle = (unitId: string, currentlyAllowed: boolean) => {
    if (!currentBuildingId) return;
    toggle.mutate({ buildingId: currentBuildingId, unitId, blocked: currentlyAllowed });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          مدیریت دسترسی واحدها به اسناد
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          به صورت پیش‌فرض همه واحدها به اسناد دسترسی دارند. در صورت غیرفعال‌سازی، آن واحد در پورتال خود اسنادی نخواهد دید.
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map(u => {
            const blocked = blockedSet.has(u.id);
            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">واحد {u.unit_number}</span>
                    {blocked ? (
                      <Badge variant="destructive" className="gap-1 text-[10px]"><Lock className="w-3 h-3" /> قطع</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-[10px]"><Unlock className="w-3 h-3" /> فعال</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {u.owner_name}{u.resident_name && u.resident_name !== u.owner_name ? ` • ${u.resident_name}` : ""}
                  </div>
                </div>
                <Switch
                  checked={!blocked}
                  onCheckedChange={() => handleToggle(u.id, !blocked)}
                  disabled={toggle.isPending}
                />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-6">واحدی یافت نشد</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
