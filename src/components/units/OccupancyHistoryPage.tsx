import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { Plus, Pencil, Trash2, Users, History, Loader2, User, Home } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PersonType = "owner" | "resident";

interface OccupancyRow {
  id: string;
  building_id: string;
  unit_id: string;
  person_type: PersonType;
  person_name: string;
  person_phone: string | null;
  start_date: string;
  end_date: string | null;
  note: string | null;
  units?: { unit_number: string } | null;
}

interface Unit {
  id: string;
  unit_number: string;
}

const toISO = (d?: Date) => (d ? d.toISOString().split("T")[0] : null);

export function OccupancyHistoryPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { currentBuilding } = useBuilding();
  const qc = useQueryClient();

  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PersonType>("all");

  const today = new Date();
  const yearAgo = new Date();
  yearAgo.setFullYear(today.getFullYear() - 1);

  const [fromDate, setFromDate] = useState<Date | undefined>(yearAgo);
  const [toDate, setToDate] = useState<Date | undefined>(today);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OccupancyRow | null>(null);

  const buildingId = currentBuilding?.id;

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["units-list", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number")
        .eq("building_id", buildingId!)
        .order("unit_number");
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!buildingId,
  });

  const { data: history = [], isLoading } = useQuery<OccupancyRow[]>({
    queryKey: ["occupancy-history", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_occupancy_history")
        .select("*, units(unit_number)")
        .eq("building_id", buildingId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as OccupancyRow[];
    },
    enabled: !!buildingId,
  });

  const filtered = useMemo(() => {
    return history.filter((r) => {
      if (unitFilter !== "all" && r.unit_id !== unitFilter) return false;
      if (typeFilter !== "all" && r.person_type !== typeFilter) return false;
      const start = new Date(r.start_date).getTime();
      const end = r.end_date ? new Date(r.end_date).getTime() : Date.now();
      const fromT = fromDate ? fromDate.getTime() : -Infinity;
      const toT = toDate ? toDate.getTime() : Infinity;
      // overlap
      return end >= fromT && start <= toT;
    });
  }, [history, unitFilter, typeFilter, fromDate, toDate]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unit_occupancy_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("رکورد حذف شد");
      qc.invalidateQueries({ queryKey: ["occupancy-history", buildingId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!buildingId) {
    return <div className="text-center text-muted-foreground py-8">ابتدا ساختمانی انتخاب کنید</div>;
  }

  return (
    <div className={embedded ? "space-y-6 animate-fade-in" : "max-w-7xl mx-auto space-y-6 animate-fade-in"} dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              تاریخچه مالک و ساکن
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              گردش افراد در هر واحد به همراه بازه‌های زمانی
            </p>
          </div>
        )}
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="gap-2 mr-auto"
        >
          <Plus className="w-4 h-4" />
          ثبت رکورد جدید
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">واحد</Label>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه واحدها</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    واحد {u.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">نوع</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">مالک و ساکن</SelectItem>
                <SelectItem value="owner">فقط مالک</SelectItem>
                <SelectItem value="resident">فقط ساکن</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">از تاریخ</Label>
            <JalaliDatePicker value={fromDate} onChange={setFromDate} buttonClassName="h-8 text-xs min-w-[110px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">تا تاریخ</Label>
            <JalaliDatePicker value={toDate} onChange={setToDate} buttonClassName="h-8 text-xs min-w-[110px]" />
          </div>
        </CardContent>
      </Card>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="timeline">تایم‌لاین</TabsTrigger>
          <TabsTrigger value="table">جدول</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView
            rows={filtered}
            units={units}
            unitFilter={unitFilter}
            from={fromDate}
            to={toDate}
            isLoading={isLoading}
            onEdit={(r) => {
              setEditing(r);
              setDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <TableView
            rows={filtered}
            isLoading={isLoading}
            onEdit={(r) => {
              setEditing(r);
              setDialogOpen(true);
            }}
            onDelete={(id) => {
              if (confirm("این رکورد حذف شود؟")) deleteMut.mutate(id);
            }}
          />
        </TabsContent>
      </Tabs>

      <OccupancyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        units={units}
        buildingId={buildingId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["occupancy-history", buildingId] })}
      />
    </div>
  );
}

/* --------------------- Timeline (Gantt-like) ---------------------- */
function TimelineView({
  rows,
  units,
  unitFilter,
  from,
  to,
  isLoading,
  onEdit,
}: {
  rows: OccupancyRow[];
  units: Unit[];
  unitFilter: string;
  from?: Date;
  to?: Date;
  isLoading: boolean;
  onEdit: (r: OccupancyRow) => void;
}) {
  const visibleUnits = useMemo(() => {
    if (unitFilter === "all") return [];
    return units.filter((u) => u.id === unitFilter);
  }, [units, unitFilter]);

  const range = useMemo(() => {
    let minT = from ? from.getTime() : Infinity;
    let maxT = to ? to.getTime() : -Infinity;
    rows.forEach((r) => {
      const s = new Date(r.start_date).getTime();
      const e = r.end_date ? new Date(r.end_date).getTime() : Date.now();
      if (!from && s < minT) minT = s;
      if (!to && e > maxT) maxT = e;
    });
    if (!isFinite(minT)) minT = Date.now() - 365 * 86400000;
    if (!isFinite(maxT)) maxT = Date.now();
    if (maxT <= minT) maxT = minT + 86400000;
    return { minT, maxT, span: maxT - minT };
  }, [rows, from, to]);

  // Generate month ticks (jalali month boundaries approximated by 30 days for display)
  const ticks = useMemo(() => {
    const out: { t: number; label: string }[] = [];
    const stepCount = 6;
    for (let i = 0; i <= stepCount; i++) {
      const t = range.minT + (range.span * i) / stepCount;
      out.push({ t, label: formatJalaliDate(new Date(t).toISOString()) });
    }
    return out;
  }, [range]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (unitFilter === "all") {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground text-sm">
          برای مشاهده تایم‌لاین، یک واحد را از فیلتر بالا انتخاب کنید
        </CardContent>
      </Card>
    );
  }

  if (visibleUnits.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground text-sm">
          رکوردی برای این واحد یافت نشد
        </CardContent>
      </Card>
    );
  }

  const pct = (t: number) => ((t - range.minT) / range.span) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          نمای زمانی واحدها
        </CardTitle>
        <div className="flex items-center gap-4 text-xs mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/80" />
            <span className="text-muted-foreground">مالک</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500/80" />
            <span className="text-muted-foreground">ساکن</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 overflow-x-auto">
        {/* Time axis */}
        <div className="relative h-6 border-b border-border min-w-[600px]" dir="ltr">
          {ticks.map((tk, i) => (
            <div
              key={i}
              className="absolute top-0 h-full text-[10px] text-muted-foreground"
              style={{ left: `${(i / (ticks.length - 1)) * 100}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-px h-2 bg-border mx-auto" />
              <div className="whitespace-nowrap mt-0.5">{tk.label}</div>
            </div>
          ))}
        </div>

        {visibleUnits.map((u) => {
          const unitRows = rows.filter((r) => r.unit_id === u.id);
          const owners = unitRows.filter((r) => r.person_type === "owner");
          const residents = unitRows.filter((r) => r.person_type === "resident");
          return (
            <div key={u.id} className="border-b border-border/50 pb-3 min-w-[600px]">
              <div className="text-xs font-semibold mb-2 text-foreground">واحد {u.unit_number}</div>
              <TimelineRow
                label="مالک"
                items={owners}
                color="bg-emerald-500/80 hover:bg-emerald-500"
                pct={pct}
                onEdit={onEdit}
              />
              <TimelineRow
                label="ساکن"
                items={residents}
                color="bg-blue-500/80 hover:bg-blue-500"
                pct={pct}
                onEdit={onEdit}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TimelineRow({
  label,
  items,
  color,
  pct,
  onEdit,
}: {
  label: string;
  items: OccupancyRow[];
  color: string;
  pct: (t: number) => number;
  onEdit: (r: OccupancyRow) => void;
}) {
  return (
    <div className="flex items-center gap-2 my-1.5" dir="ltr">
      <div className="w-12 text-[10px] text-muted-foreground shrink-0 text-right" dir="rtl">
        {label}
      </div>
      <div className="relative flex-1 h-7 bg-muted/40 rounded">
        {items.map((r) => {
          const s = new Date(r.start_date).getTime();
          const e = r.end_date ? new Date(r.end_date).getTime() : Date.now();
          const left = Math.max(0, pct(s));
          const right = Math.min(100, pct(e));
          const width = Math.max(0.5, right - left);
          const isOpen = !r.end_date;
          return (
            <TooltipProvider key={r.id} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onEdit(r)}
                    className={cn(
                      "absolute top-0.5 bottom-0.5 rounded text-[10px] text-white px-1.5 truncate transition-all flex items-center",
                      color,
                      isOpen && "ring-2 ring-offset-1 ring-offset-background ring-current"
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    dir="rtl"
                  >
                    <span className="truncate">{r.person_name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" dir="rtl">
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold">{r.person_name}</div>
                    {r.person_phone && <div>{r.person_phone}</div>}
                    <div>از {formatJalaliDate(r.start_date)}</div>
                    <div>{r.end_date ? `تا ${formatJalaliDate(r.end_date)}` : "تا کنون"}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------- Table View ---------------------- */
function TableView({
  rows,
  isLoading,
  onEdit,
  onDelete,
}: {
  rows: OccupancyRow[];
  isLoading: boolean;
  onEdit: (r: OccupancyRow) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground text-sm">
          رکوردی یافت نشد
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="p-3 text-right">واحد</th>
              <th className="p-3 text-right">نوع</th>
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">تلفن</th>
              <th className="p-3 text-right">از تاریخ</th>
              <th className="p-3 text-right">تا تاریخ</th>
              <th className="p-3 text-right">یادداشت</th>
              <th className="p-3 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">{r.units?.unit_number ?? "-"}</td>
                <td className="p-3">
                  {r.person_type === "owner" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
                      <Home className="w-3 h-3" />
                      مالک
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1">
                      <User className="w-3 h-3" />
                      ساکن
                    </Badge>
                  )}
                </td>
                <td className="p-3 font-medium">{r.person_name}</td>
                <td className="p-3 text-muted-foreground" dir="ltr">{r.person_phone ?? "-"}</td>
                <td className="p-3">{formatJalaliDate(r.start_date)}</td>
                <td className="p-3">
                  {r.end_date ? (
                    formatJalaliDate(r.end_date)
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      جاری
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">
                  {r.note ?? "-"}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDelete(r.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/* --------------------- Add / Edit Dialog ---------------------- */
function OccupancyDialog({
  open,
  onOpenChange,
  editing,
  units,
  buildingId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: OccupancyRow | null;
  units: Unit[];
  buildingId: string;
  onSaved: () => void;
}) {
  const [unitId, setUnitId] = useState("");
  const [personType, setPersonType] = useState<PersonType>("owner");
  const [personName, setPersonName] = useState("");
  const [personPhone, setPersonPhone] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setUnitId(editing.unit_id);
        setPersonType(editing.person_type);
        setPersonName(editing.person_name);
        setPersonPhone(editing.person_phone ?? "");
        setStartDate(new Date(editing.start_date));
        setEndDate(editing.end_date ? new Date(editing.end_date) : undefined);
        setNote(editing.note ?? "");
      } else {
        setUnitId("");
        setPersonType("owner");
        setPersonName("");
        setPersonPhone("");
        setStartDate(new Date());
        setEndDate(undefined);
        setNote("");
      }
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!unitId || !personName.trim() || !startDate) {
      toast.error("واحد، نام و تاریخ شروع الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        building_id: buildingId,
        unit_id: unitId,
        person_type: personType,
        person_name: personName.trim(),
        person_phone: personPhone.trim() || null,
        start_date: toISO(startDate)!,
        end_date: toISO(endDate),
        note: note.trim() || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("unit_occupancy_history")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("رکورد به‌روزرسانی شد");
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("unit_occupancy_history")
          .insert({ ...payload, created_by: userData.user?.id });
        if (error) throw error;
        toast.success("رکورد ثبت شد");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش رکورد" : "ثبت رکورد جدید"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <Label className="text-right text-sm">واحد *</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب واحد" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    واحد {u.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="text-right text-sm">نوع *</Label>
            <Select value={personType} onValueChange={(v) => setPersonType(v as PersonType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">مالک</SelectItem>
                <SelectItem value="resident">ساکن</SelectItem>
              </SelectContent>
            </Select>

            <Label className="text-right text-sm">نام *</Label>
            <Input value={personName} onChange={(e) => setPersonName(e.target.value)} />

            <Label className="text-right text-sm">تلفن</Label>
            <Input value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} dir="ltr" />

            <Label className="text-right text-sm">از تاریخ *</Label>
            <JalaliDatePicker value={startDate} onChange={setStartDate} />

            <Label className="text-right text-sm">تا تاریخ</Label>
            <JalaliDatePicker value={endDate} onChange={setEndDate} placeholder="در صورت پایان یافتن" />

            <Label className="text-right text-sm">یادداشت</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
