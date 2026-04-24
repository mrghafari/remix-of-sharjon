import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, MapPin, Check, X, Clock, Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2, Lock, AlertTriangle, UserCog } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useReservationVenues, useCreateReservationVenue, useUpdateReservationVenue, useDeleteReservationVenue, useReservations, useCreateReservation, useUpdateReservationStatus, useDeleteReservation, type Reservation } from "@/hooks/useReservations";
import { useUnits } from "@/hooks/useUnits";
import { useBuilding } from "@/contexts/BuildingContext";
import { useResidentUnit } from "@/hooks/useResidentUnit";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday, parseISO } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ReservationsListProps {
  /** when true, render in resident mode (request only, no venue management) */
  residentMode?: boolean;
  /** override building id (resident portal) */
  buildingId?: string;
  /** unit id (resident portal) */
  unitId?: string;
  /** display name for the requester */
  requesterName?: string;
}

const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const normalizeTime = (v: string) => {
  return v
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
};

const statusBadge = (s: string) => {
  if (s === "approved") return <Badge className="bg-success text-success-foreground">تایید شده</Badge>;
  if (s === "rejected") return <Badge variant="destructive">رد شده</Badge>;
  return <Badge variant="secondary">در انتظار</Badge>;
};

export function ReservationsList({ residentMode = false, buildingId, unitId, requesterName }: ReservationsListProps) {
  const { currentBuildingId } = useBuilding();
  const { user } = useAuth();
  const bId = buildingId || currentBuildingId;

  const { data: venues = [] } = useReservationVenues(bId || undefined);
  const { data: reservations = [], isLoading } = useReservations(bId || undefined);
  const { data: units = [] } = useUnits();
  const createVenue = useCreateReservationVenue();
  const updateVenue = useUpdateReservationVenue();
  const deleteVenue = useDeleteReservationVenue();
  const createReservation = useCreateReservation();
  const updateStatus = useUpdateReservationStatus();
  const deleteReservation = useDeleteReservation();

  // Venue form
  const [venueDialog, setVenueDialog] = useState(false);
  const [venueName, setVenueName] = useState("");
  const [venueDesc, setVenueDesc] = useState("");
  const [venueExclusive, setVenueExclusive] = useState(false);
  const [deleteVenueId, setDeleteVenueId] = useState<string | null>(null);

  // Request form
  const [requestDialog, setRequestDialog] = useState(false);
  const [reqVenue, setReqVenue] = useState("");
  const [reqName, setReqName] = useState(requesterName || "");
  const [reqDate, setReqDate] = useState<Date | undefined>(new Date());
  const [reqStart, setReqStart] = useState("18:00");
  const [reqEnd, setReqEnd] = useState("22:00");
  const [reqDesc, setReqDesc] = useState("");
  const [reqExclusive, setReqExclusive] = useState(false);
  const [reqOnBehalfUnitId, setReqOnBehalfUnitId] = useState<string>("");

  // Approval
  const [reviewTarget, setReviewTarget] = useState<Reservation | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  // Visual calendar
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string>("all");
  const [viewDate, setViewDate] = useState(new Date());
  const monthLabel = format(viewDate, "MMMM yyyy", { locale: faIR });
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { locale: faIR, weekStartsOn: 6 });
    const calEnd = endOfWeek(monthEnd, { locale: faIR, weekStartsOn: 6 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewDate]);

  const filteredReservations = useMemo(() => {
    return selectedVenueFilter === "all" ? reservations : reservations.filter(r => r.venue_id === selectedVenueFilter);
  }, [reservations, selectedVenueFilter]);

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    filteredReservations.forEach(r => {
      if (!map[r.reservation_date]) map[r.reservation_date] = [];
      map[r.reservation_date].push(r);
    });
    return map;
  }, [filteredReservations]);

  const venueMap = useMemo(() => Object.fromEntries(venues.map(v => [v.id, v])), [venues]);

  const handleCreateVenue = () => {
    if (!venueName.trim() || !bId) return;
    createVenue.mutate(
      { building_id: bId, name: venueName.trim(), description: venueDesc.trim() || null, is_active: true, exclusive: venueExclusive },
      { onSuccess: () => { setVenueDialog(false); setVenueName(""); setVenueDesc(""); setVenueExclusive(false); } }
    );
  };

  // Detect overlap with existing approved/pending reservations
  const overlapInfo = useMemo(() => {
    if (!reqVenue || !reqDate || !reqStart || !reqEnd) return null;
    const venue = venueMap[reqVenue];
    if (!venue) return null;
    const dateStr = reqDate.toISOString().split("T")[0];
    const sameDay = reservations.filter(r =>
      r.venue_id === reqVenue &&
      r.reservation_date === dateStr &&
      r.status !== "rejected"
    );
    const conflicts = sameDay.filter(r => {
      // Existing exclusive booking blocks everything that day
      if (r.is_exclusive) return true;
      // New request is exclusive — blocks any other booking
      if (reqExclusive) return true;
      // Time-overlap check (only for exclusive venues)
      if (!venue.exclusive) return false;
      return reqStart < r.end_time.slice(0, 5) && reqEnd > r.start_time.slice(0, 5);
    });
    return conflicts.length > 0 ? conflicts : null;
  }, [reqVenue, reqDate, reqStart, reqEnd, reqExclusive, reservations, venueMap]);

  const handleCreateRequest = async () => {
    if (!bId || !reqVenue || !reqDate || !reqName.trim() || !reqStart || !reqEnd) return;
    if (reqStart >= reqEnd) return;
    if (overlapInfo) return;
    const gregDate = reqDate.toISOString().split("T")[0];
    const targetUnitId = !residentMode && reqOnBehalfUnitId ? reqOnBehalfUnitId : (unitId || null);
    createReservation.mutate(
      {
        building_id: bId,
        venue_id: reqVenue,
        unit_id: targetUnitId,
        requester_user_id: user?.id || null,
        requester_name: reqName.trim(),
        reservation_date: gregDate,
        start_time: reqStart,
        end_time: reqEnd,
        description: reqDesc.trim() || null,
        is_exclusive: reqExclusive,
      },
      {
        onSuccess: async (_data: any, _vars, _ctx) => {
          // Auto-approve when manager creates on behalf
          if (!residentMode) {
            // best-effort: fetch latest reservation by these fields and approve
            const { data: latest } = await supabase
              .from("reservations" as any)
              .select("id")
              .eq("building_id", bId)
              .eq("venue_id", reqVenue)
              .eq("reservation_date", gregDate)
              .eq("start_time", reqStart)
              .eq("end_time", reqEnd)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const latestId = (latest as any)?.id as string | undefined;
            if (latestId) {
              updateStatus.mutate({ id: latestId, status: "approved", manager_note: "ثبت توسط مدیر" });
            }
          }
          setRequestDialog(false);
          setReqDesc("");
          setReqExclusive(false);
          setReqOnBehalfUnitId("");
        },
      }
    );
  };

  const handleApprove = (status: "approved" | "rejected") => {
    if (!reviewTarget) return;
    updateStatus.mutate(
      { id: reviewTarget.id, status, manager_note: reviewNote.trim() },
      { onSuccess: () => { setReviewTarget(null); setReviewNote(""); } }
    );
  };

  const dayHasApproved = (d: Date) => {
    const key = d.toISOString().split("T")[0];
    return (reservationsByDate[key] || []).some(r => r.status === "approved");
  };
  const dayHasPending = (d: Date) => {
    const key = d.toISOString().split("T")[0];
    return (reservationsByDate[key] || []).some(r => r.status === "pending");
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={selectedVenueFilter} onValueChange={setSelectedVenueFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه مکان‌ها</SelectItem>
              {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {residentMode ? (
            <Button onClick={() => setRequestDialog(true)} className="gap-2" disabled={venues.length === 0}>
              <Plus className="w-4 h-4" /> درخواست رزرو
            </Button>
          ) : (
            <Button onClick={() => setRequestDialog(true)} className="gap-2 bg-primary" disabled={venues.length === 0}>
              <UserCog className="w-4 h-4" /> رزرو به نیابت از واحد
            </Button>
          )}
          {!residentMode && (
            <Button variant="outline" onClick={() => setVenueDialog(true)} className="gap-2">
              <MapPin className="w-4 h-4" /> افزودن مکان
            </Button>
          )}
        </div>
      </div>

      {venues.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          هنوز مکانی برای رزرو تعریف نشده است{!residentMode && "؛ از دکمه «افزودن مکان» شروع کنید"}.
        </CardContent></Card>
      )}

      {/* Venues list (manager) */}
      {!residentMode && venues.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> مکان‌های قابل رزرو</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      <span className="truncate">{v.name}</span>
                      {v.exclusive && <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="w-3 h-3" /> انحصاری</Badge>}
                    </div>
                    {v.description && <div className="text-xs text-muted-foreground mt-0.5 truncate">{v.description}</div>}
                    <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={v.exclusive}
                        onCheckedChange={(c) => updateVenue.mutate({ id: v.id, exclusive: !!c })}
                      />
                      <span className="text-muted-foreground">عدم اجازه تداخل زمانی (مثل لابی)</span>
                    </label>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteVenueId(v.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="calendar" dir="rtl">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2"><CalIcon className="w-4 h-4" /> تقویم رزروها</TabsTrigger>
          <TabsTrigger value="list" className="gap-2"><Clock className="w-4 h-4" /> لیست درخواست‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => setViewDate(subMonths(viewDate, 1))}><ChevronRight className="w-4 h-4" /></Button>
                <CardTitle className="text-base">{monthLabel}</CardTitle>
                <Button variant="outline" size="icon" onClick={() => setViewDate(addMonths(viewDate, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive/70" /> پر / تایید شده</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warning/70" /> در انتظار تایید</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-primary" /> امروز</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const inMonth = format(day, "M", { locale: faIR }) === format(viewDate, "M", { locale: faIR });
                  const key = day.toISOString().split("T")[0];
                  const dayItems = reservationsByDate[key] || [];
                  const approved = dayHasApproved(day);
                  const pending = dayHasPending(day);
                  const today = isToday(day);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[90px] rounded-lg border p-1.5 text-xs transition-colors",
                        !inMonth && "opacity-40 bg-muted/30",
                        approved && "bg-destructive/10 border-destructive/30",
                        !approved && pending && "bg-warning/10 border-warning/30",
                        today && "ring-2 ring-primary",
                      )}
                    >
                      <div className="font-bold mb-1">{format(day, "d", { locale: faIR })}</div>
                      <div className="space-y-1">
                        {dayItems.slice(0, 3).map(r => (
                          <div
                            key={r.id}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] truncate cursor-pointer",
                              r.status === "approved" && "bg-destructive/80 text-destructive-foreground",
                              r.status === "pending" && "bg-warning/80 text-warning-foreground",
                              r.status === "rejected" && "bg-muted text-muted-foreground line-through",
                            )}
                            onClick={() => setReviewTarget(r)}
                            title={`${venueMap[r.venue_id]?.name || ""} • ${r.start_time.slice(0,5)}-${r.end_time.slice(0,5)} • ${r.requester_name}`}
                          >
                            {r.start_time.slice(0, 5)} {venueMap[r.venue_id]?.name?.slice(0, 8)}
                          </div>
                        ))}
                        {dayItems.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3} مورد</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="space-y-2">
            {filteredReservations.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">رزروی ثبت نشده است</CardContent></Card>
            ) : (
              filteredReservations.map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold">{venueMap[r.venue_id]?.name || "—"}</span>
                        {statusBadge(r.status)}
                        {r.is_exclusive && <Badge variant="outline" className="gap-1 text-[10px] border-warning text-warning"><Lock className="w-3 h-3" /> قرق کامل</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(r.reservation_date), "d MMMM yyyy", { locale: faIR })} • {r.start_time.slice(0,5)} تا {r.end_time.slice(0,5)} • {r.requester_name}
                        {r.unit_id && units.find(u => u.id === r.unit_id) && (
                          <span className="text-primary"> • واحد {units.find(u => u.id === r.unit_id)?.unit_number}</span>
                        )}
                      </div>
                      {r.description && <div className="text-xs text-muted-foreground mt-1">{r.description}</div>}
                      {r.manager_note && <div className="text-xs mt-1 p-2 rounded bg-muted">یادداشت مدیر: {r.manager_note}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!residentMode && r.status === "pending" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => { setReviewTarget(r); setReviewNote(""); }}>
                            <Check className="w-4 h-4 text-success" />
                          </Button>
                        </>
                      )}
                      {(!residentMode || (r.status === "pending" && r.requester_user_id === user?.id)) && (
                        <Button size="icon" variant="ghost" onClick={() => deleteReservation.mutate(r.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Venue Dialog */}
      <Dialog open={venueDialog} onOpenChange={setVenueDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>افزودن مکان قابل رزرو</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">نام مکان</label>
              <Input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="مثلا سالن همایش، روف گاردن، استخر" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">توضیحات (اختیاری)</label>
              <Textarea value={venueDesc} onChange={e => setVenueDesc(e.target.value)} placeholder="ظرفیت، شرایط استفاده و..." />
            </div>
            <label className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30 cursor-pointer">
              <Checkbox checked={venueExclusive} onCheckedChange={(c) => setVenueExclusive(!!c)} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> مکان انحصاری (عدم تداخل زمانی)</div>
                <div className="text-xs text-muted-foreground mt-0.5">برای مکان‌هایی مثل لابی که فقط یک نفر در یک بازه می‌تواند رزرو کند. برای استخر یا روف گاردن خاموش بگذارید.</div>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVenueDialog(false)}>انصراف</Button>
            <Button onClick={handleCreateVenue} disabled={!venueName.trim() || createVenue.isPending}>
              {createVenue.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {!residentMode && <UserCog className="w-5 h-5 text-primary" />}
              {residentMode ? "درخواست رزرو جدید" : "ثبت رزرو به نیابت از واحد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!residentMode && (
              <div className="p-2 rounded bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                این رزرو با عنوان مدیر ثبت و به‌صورت خودکار تایید می‌شود.
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">مکان</label>
              <Select value={reqVenue} onValueChange={setReqVenue}>
                <SelectTrigger><SelectValue placeholder="انتخاب مکان" /></SelectTrigger>
                <SelectContent>
                  {venues.map(v => <SelectItem key={v.id} value={v.id}>{v.name}{v.exclusive ? " (انحصاری)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!residentMode && (
              <div>
                <label className="text-sm font-medium mb-1 block">واحد متقاضی (به نیابت از)</label>
                <Select
                  value={reqOnBehalfUnitId}
                  onValueChange={(v) => {
                    setReqOnBehalfUnitId(v);
                    const u = units.find(x => x.id === v);
                    if (u) setReqName(u.resident_name || u.owner_name || `واحد ${u.unit_number}`);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="انتخاب واحد (اختیاری)" /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        واحد {u.unit_number} — {u.resident_name || u.owner_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">نام درخواست‌کننده</label>
              <Input value={reqName} onChange={e => setReqName(e.target.value)} placeholder="نام شما" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">تاریخ رزرو</label>
              <JalaliDatePicker value={reqDate} onChange={setReqDate} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">از ساعت</label>
                <Input type="time" value={reqStart} onChange={e => setReqStart(normalizeTime(e.target.value))} dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">تا ساعت</label>
                <Input type="time" value={reqEnd} onChange={e => setReqEnd(normalizeTime(e.target.value))} dir="ltr" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">توضیحات</label>
              <Textarea value={reqDesc} onChange={e => setReqDesc(e.target.value)} placeholder="مناسبت، تعداد مهمان و..." />
            </div>
            <label className="flex items-start gap-2 p-3 rounded-lg border border-warning/40 bg-warning/5 cursor-pointer">
              <Checkbox checked={reqExclusive} onCheckedChange={(c) => setReqExclusive(!!c)} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> قرق کامل مکان (نیاز به تایید مدیر)</div>
                <div className="text-xs text-muted-foreground mt-0.5">کل روز مکان به نام شما رزرو می‌شود و دیگران نمی‌توانند رزرو کنند. مثلاً قرق استخر برای خانواده.</div>
              </div>
            </label>
            {overlapInfo && (
              <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm">
                <div className="flex items-center gap-1.5 font-medium text-destructive mb-1">
                  <AlertTriangle className="w-4 h-4" /> تداخل زمانی با {overlapInfo.length} رزرو موجود
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5 mr-5 list-disc">
                  {overlapInfo.slice(0, 3).map(c => (
                    <li key={c.id}>
                      {c.requester_name} • {c.start_time.slice(0,5)}-{c.end_time.slice(0,5)}
                      {c.is_exclusive && " (قرق کامل)"} • {c.status === "approved" ? "تایید شده" : "در انتظار"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialog(false)}>انصراف</Button>
            <Button onClick={handleCreateRequest} disabled={createReservation.isPending || !reqVenue || !reqName.trim() || !reqDate || !!overlapInfo}>
              {createReservation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {residentMode ? "ثبت درخواست" : "ثبت و تایید رزرو"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review / Detail Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) { setReviewTarget(null); setReviewNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>جزئیات رزرو</DialogTitle></DialogHeader>
          {reviewTarget && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">مکان: </span><span className="font-medium">{venueMap[reviewTarget.venue_id]?.name}</span></div>
              <div><span className="text-muted-foreground">درخواست‌کننده: </span>{reviewTarget.requester_name}</div>
              <div><span className="text-muted-foreground">تاریخ: </span>{format(parseISO(reviewTarget.reservation_date), "d MMMM yyyy", { locale: faIR })}</div>
              <div><span className="text-muted-foreground">ساعت: </span>{reviewTarget.start_time.slice(0,5)} - {reviewTarget.end_time.slice(0,5)}</div>
              <div><span className="text-muted-foreground">وضعیت: </span>{statusBadge(reviewTarget.status)}</div>
              {reviewTarget.is_exclusive && (
                <div className="p-2 rounded border border-warning/40 bg-warning/5 text-xs flex items-center gap-1.5 text-warning-foreground">
                  <Lock className="w-3.5 h-3.5 text-warning" /> این درخواست برای قرق کامل مکان در طول روز است.
                </div>
              )}
              {reviewTarget.description && <div><span className="text-muted-foreground">توضیحات: </span>{reviewTarget.description}</div>}
              {reviewTarget.manager_note && <div className="p-2 rounded bg-muted text-xs">یادداشت مدیر: {reviewTarget.manager_note}</div>}
              {!residentMode && reviewTarget.status === "pending" && (
                <div className="pt-2">
                  <label className="text-sm font-medium mb-1 block">یادداشت مدیر (اختیاری)</label>
                  <Textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
                </div>
              )}
            </div>
          )}
          {!residentMode && reviewTarget?.status === "pending" && (
            <DialogFooter>
              <Button variant="destructive" onClick={() => handleApprove("rejected")} disabled={updateStatus.isPending} className="gap-1">
                <X className="w-4 h-4" /> رد
              </Button>
              <Button onClick={() => handleApprove("approved")} disabled={updateStatus.isPending} className="gap-1">
                <Check className="w-4 h-4" /> تایید
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete venue confirm */}
      <AlertDialog open={!!deleteVenueId} onOpenChange={(o) => !o && setDeleteVenueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مکان</AlertDialogTitle>
            <AlertDialogDescription>تمام رزروهای مرتبط با این مکان نیز حذف خواهند شد. ادامه می‌دهید؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteVenueId) { deleteVenue.mutate(deleteVenueId); setDeleteVenueId(null); } }}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
