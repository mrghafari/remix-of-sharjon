import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, FolderCog, Folder } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useUnits } from "@/hooks/useUnits";
import {
  useUnitDocumentAccessBlocks,
  useToggleUnitDocumentAccess,
  type DocAccessPersonType,
  type UnitDocAccessBlock,
} from "@/hooks/useUnitDocumentAccess";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_FOLDERS = ["عمومی", "قراردادها", "صورتجلسات", "نقشه‌ها", "مالی"];

export function DocumentAccessManager() {
  const { currentBuildingId } = useBuilding();
  const { data: units = [] } = useUnits();
  const { data: blocks = [] } = useUnitDocumentAccessBlocks(currentBuildingId || undefined);
  const toggle = useToggleUnitDocumentAccess();
  const [search, setSearch] = useState("");
  const [folderDialogUnit, setFolderDialogUnit] = useState<{ id: string; unit_number: string } | null>(null);

  // All known folders for this building (defaults + custom localStorage + folders that exist on documents)
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  useEffect(() => {
    if (!currentBuildingId) return;
    try {
      const raw = localStorage.getItem(`custom-folders:${currentBuildingId}`);
      setCustomFolders(raw ? JSON.parse(raw) : []);
    } catch { setCustomFolders([]); }
  }, [currentBuildingId]);

  const { data: docFolders = [] } = useQuery({
    queryKey: ["doc-folders-list", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("building_documents")
        .select("folder")
        .eq("building_id", currentBuildingId);
      if (error) throw error;
      return Array.from(new Set((data || []).map((d: any) => d.folder).filter(Boolean)));
    },
    enabled: !!currentBuildingId,
  });

  const allFolders = useMemo(
    () => Array.from(new Set([...DEFAULT_FOLDERS, ...customFolders, ...docFolders])),
    [customFolders, docFolders]
  );

  // Lookup helpers
  const isUnitWideBlocked = (unitId: string, person: DocAccessPersonType) =>
    blocks.some(b => b.unit_id === unitId && b.folder === null &&
      (b.person_type === person || b.person_type === "both"));

  const isFolderBlocked = (unitId: string, person: DocAccessPersonType, folder: string) =>
    blocks.some(b => b.unit_id === unitId && b.folder === folder &&
      (b.person_type === person || b.person_type === "both"));

  const folderBlockCount = (unitId: string) =>
    blocks.filter(b => b.unit_id === unitId && b.folder !== null).length;

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return units;
    return units.filter(u =>
      u.unit_number.includes(q) ||
      (u.owner_name || "").includes(q) ||
      (u.resident_name || "").includes(q)
    );
  }, [units, search]);

  const handleUnitWideToggle = (unitId: string, person: DocAccessPersonType, currentlyAllowed: boolean) => {
    if (!currentBuildingId) return;
    toggle.mutate({
      buildingId: currentBuildingId,
      unitId,
      personType: person,
      folder: null,
      blocked: currentlyAllowed,
    });
  };

  const handleFolderToggle = (unitId: string, person: DocAccessPersonType, folder: string, currentlyAllowed: boolean) => {
    if (!currentBuildingId) return;
    toggle.mutate({
      buildingId: currentBuildingId,
      unitId,
      personType: person,
      folder,
      blocked: currentlyAllowed,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          مدیریت دسترسی واحدها به اسناد
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          دسترسی مالک یا ساکن هر واحد را به‌صورت کلی فعال/غیرفعال کنید، یا با گزینه «دسترسی پوشه‌ای» اجازه را برای پوشه‌های خاص محدود کنید.
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
        <div className="grid gap-2 sm:grid-cols-2 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map(u => {
            const ownerBlocked = isUnitWideBlocked(u.id, "owner");
            const residentBlocked = isUnitWideBlocked(u.id, "resident");
            const folderRules = folderBlockCount(u.id);
            return (
              <div key={u.id} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">واحد {u.unit_number}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setFolderDialogUnit({ id: u.id, unit_number: u.unit_number })}
                  >
                    <FolderCog className="w-3.5 h-3.5" />
                    دسترسی پوشه‌ای
                    {folderRules > 0 && (
                      <span className="bg-primary/15 text-primary px-1.5 rounded text-[10px]">{folderRules}</span>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">مالک</div>
                    <div className="truncate">{u.owner_name || "—"}</div>
                  </div>
                  <Switch
                    checked={!ownerBlocked}
                    onCheckedChange={() => handleUnitWideToggle(u.id, "owner", !ownerBlocked)}
                    disabled={toggle.isPending}
                  />
                </div>

                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">ساکن</div>
                    <div className="truncate">{u.resident_name || "—"}</div>
                  </div>
                  <Switch
                    checked={!residentBlocked}
                    onCheckedChange={() => handleUnitWideToggle(u.id, "resident", !residentBlocked)}
                    disabled={toggle.isPending}
                  />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-6">واحدی یافت نشد</div>
          )}
        </div>
      </CardContent>

      {/* Per-folder access dialog */}
      <Dialog open={!!folderDialogUnit} onOpenChange={(o) => !o && setFolderDialogUnit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderCog className="w-5 h-5" />
              دسترسی پوشه‌ای — واحد {folderDialogUnit?.unit_number}
            </DialogTitle>
            <DialogDescription className="text-xs">
              برای هر پوشه می‌توانید به‌صورت جداگانه به مالک یا ساکن اجازه دسترسی بدهید یا قطع کنید.
              اگر سوئیچ کلی واحد روی «خاموش» باشد، تنظیمات پوشه‌ای نادیده گرفته می‌شود.
            </DialogDescription>
          </DialogHeader>

          {folderDialogUnit && (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground py-2 border-b">
                <div className="col-span-6">پوشه</div>
                <div className="col-span-3 text-center">مالک</div>
                <div className="col-span-3 text-center">ساکن</div>
              </div>
              {allFolders.map(folder => {
                const ownerOk = !isFolderBlocked(folderDialogUnit.id, "owner", folder);
                const residentOk = !isFolderBlocked(folderDialogUnit.id, "resident", folder);
                return (
                  <div key={folder} className="grid grid-cols-12 gap-2 items-center py-2 border-b last:border-b-0">
                    <div className="col-span-6 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm truncate">{folder}</span>
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <Switch
                        checked={ownerOk}
                        onCheckedChange={() => handleFolderToggle(folderDialogUnit.id, "owner", folder, ownerOk)}
                        disabled={toggle.isPending}
                      />
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <Switch
                        checked={residentOk}
                        onCheckedChange={() => handleFolderToggle(folderDialogUnit.id, "resident", folder, residentOk)}
                        disabled={toggle.isPending}
                      />
                    </div>
                  </div>
                );
              })}
              {allFolders.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">پوشه‌ای یافت نشد</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
