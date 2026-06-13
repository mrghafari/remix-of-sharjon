import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { toast } from "sonner";
import { Video, Plus, Trash2, Pencil, Calendar, Clock, Loader2, ExternalLink, Copy, Users, MapPin } from "lucide-react";
import { sendSmsBatch } from "@/hooks/useSms";

type Audience = "owners" | "residents" | "both";

interface OnlineMeeting {
  id: string;
  building_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  room_name: string | null;
  jitsi_domain: string | null;
  created_by: string | null;
  created_at: string;
  audience: Audience;
  excluded_owner_unit_ids: string[];
  excluded_resident_unit_ids: string[];
  location: string | null;
  has_online: boolean;
}

interface UnitRow {
  id: string;
  unit_number: string;
  owner_name: string | null;
  resident_name: string | null;
  phone: string | null;
  resident_phone: string | null;
}

interface Props {
  buildingId: string;
  canEdit?: boolean;
}

function buildLink(domain: string | null, room: string | null) {
  if (!domain || !room) return "";
  return `https://${domain}/${encodeURIComponent(room)}`;
}

function generateRoom(buildingId: string) {
  const slug = Math.random().toString(36).slice(2, 8);
  return `bldg-${buildingId.slice(0, 8)}-${slug}`;
}

function pad(n: number) { return n.toString().padStart(2, "0"); }

const audienceLabel = (a: Audience) =>
  a === "owners" ? "مالکین" : a === "residents" ? "ساکنین" : "مالکین و ساکنین";

export function OnlineMeetingsPage({ buildingId, canEdit = true }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OnlineMeeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnlineMeeting | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [hasOnline, setHasOnline] = useState(true);
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [meetingTime, setMeetingTime] = useState("20:00");
  const [audience, setAudience] = useState<Audience>("both");
  const [excludedOwners, setExcludedOwners] = useState<Set<string>>(new Set());
  const [excludedResidents, setExcludedResidents] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { data: units = [] } = useQuery({
    queryKey: ["units_for_meetings", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, owner_name, resident_name, phone, resident_phone")
        .eq("building_id", buildingId)
        .order("unit_number");
      if (error) throw error;
      return (data || []) as UnitRow[];
    },
    enabled: !!buildingId && canEdit,
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["online_meetings", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_online_meetings" as any)
        .select("*")
        .eq("building_id", buildingId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OnlineMeeting[];
    },
    enabled: !!buildingId,
  });

  const now = Date.now();
  const upcoming = useMemo(
    () => meetings.filter(m => new Date(m.scheduled_at).getTime() >= now - 2 * 3600 * 1000),
    [meetings, now]
  );
  const past = useMemo(
    () => meetings.filter(m => new Date(m.scheduled_at).getTime() < now - 2 * 3600 * 1000),
    [meetings, now]
  );

  const resetForm = () => {
    setTitle(""); setDescription("");
    setLocation(""); setHasOnline(true);
    setMeetingDate(new Date()); setMeetingTime("20:00");
    setAudience("both");
    setExcludedOwners(new Set());
    setExcludedResidents(new Set());
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (m: OnlineMeeting) => {
    setEditing(m);
    setTitle(m.title);
    setDescription(m.description || "");
    setLocation(m.location || "");
    setHasOnline(m.has_online !== false && !!m.room_name);
    const d = new Date(m.scheduled_at);
    setMeetingDate(d);
    setMeetingTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setAudience(m.audience || "both");
    setExcludedOwners(new Set(m.excluded_owner_unit_ids || []));
    setExcludedResidents(new Set(m.excluded_resident_unit_ids || []));
    setDialogOpen(true);
  };

  const toggleExcl = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const ownerCandidates = useMemo(
    () => units.filter(u => u.phone && (u.phone.trim().length > 0)),
    [units]
  );
  const residentCandidates = useMemo(
    () => units.filter(u => u.resident_phone && u.resident_phone !== u.phone),
    [units]
  );

  const notifyResidents = async (meeting: OnlineMeeting) => {
    try {
      const { data: unitsAll } = await supabase
        .from("units")
        .select("id, unit_number, owner_name, resident_name, phone, resident_phone")
        .eq("building_id", buildingId);

      const recipients: any[] = [];
      const link = meeting.has_online ? buildLink(meeting.jitsi_domain, meeting.room_name) : "";
      const d = new Date(meeting.scheduled_at);
      const vars = {
        "عنوان": meeting.title,
        "تاریخ": formatJalaliDate(d.toISOString()),
        "ساعت": `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        "لینک": link,
        "مکان": meeting.location || "",
        "ساختمان": "",
      };

      const exOwners = new Set(meeting.excluded_owner_unit_ids || []);
      const exResidents = new Set(meeting.excluded_resident_unit_ids || []);
      const includeOwners = meeting.audience === "owners" || meeting.audience === "both";
      const includeResidents = meeting.audience === "residents" || meeting.audience === "both";

      (unitsAll || []).forEach((u: any) => {
        if (includeOwners && u.phone && !exOwners.has(u.id)) {
          recipients.push({ phone: u.phone, name: u.owner_name || "همسایه گرامی", role: "owner", unit_id: u.id, variables: { ...vars, "نام": u.owner_name || "" } });
        }
        if (includeResidents && u.resident_phone && u.resident_phone !== u.phone && !exResidents.has(u.id)) {
          recipients.push({ phone: u.resident_phone, name: u.resident_name || "همسایه گرامی", role: "resident", unit_id: u.id, variables: { ...vars, "نام": u.resident_name || "" } });
        }
      });

      const audienceText = audienceLabel(meeting.audience);
      const locLine = meeting.location ? `\nمکان: ${meeting.location}` : "";
      const onlineLine = meeting.has_online && link
        ? `\n\nبرای کسانی که نمی‌توانند حضوری شرکت کنند، امکان حضور آنلاین فراهم است:\n${link}`
        : "";
      await (supabase as any).from("building_announcements").insert({
        building_id: buildingId,
        title: `جلسه: ${meeting.title}`,
        content: `جلسه در تاریخ ${formatJalaliDate(d.toISOString())} ساعت ${pad(d.getHours())}:${pad(d.getMinutes())} برگزار می‌شود.${locLine}\nمدعوین: ${audienceText}${onlineLine}${meeting.description ? `\n\n${meeting.description}` : ""}`,
        is_pinned: true,
        created_by: user?.id,
      });

      if (recipients.length > 0) {
        try {
          await sendSmsBatch({ building_id: buildingId, template_key: "online_meeting_invite", recipients });
        } catch (e) {
          console.warn("SMS send failed", e);
        }
      }
    } catch (e) {
      console.warn("Notify failed", e);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !meetingDate || !user) {
      toast.error("عنوان و تاریخ جلسه الزامی است");
      return;
    }
    if (!location.trim() && !hasOnline) {
      toast.error("مکان برگزاری را وارد کنید یا گزینه حضور آنلاین را فعال کنید");
      return;
    }
    const [hh, mm] = meetingTime.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm)) {
      toast.error("ساعت نامعتبر است");
      return;
    }
    setSubmitting(true);
    try {
      const dt = new Date(meetingDate);
      dt.setHours(hh, mm, 0, 0);

      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: dt.toISOString(),
        audience,
        excluded_owner_unit_ids: Array.from(excludedOwners),
        excluded_resident_unit_ids: Array.from(excludedResidents),
        location: location.trim() || null,
        has_online: hasOnline,
      };

      if (editing) {
        // Preserve / create room if has_online toggled on
        if (hasOnline && !editing.room_name) {
          payload.room_name = generateRoom(buildingId);
          payload.jitsi_domain = "meet.jit.si";
        }
        const { data: updated, error } = await supabase
          .from("building_online_meetings" as any)
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw error;
        toast.success("جلسه به‌روزرسانی شد و اطلاع‌رسانی مجدد ارسال می‌شود");
        if (updated) await notifyResidents(updated as unknown as OnlineMeeting);
      } else {
        if (hasOnline) {
          payload.room_name = generateRoom(buildingId);
          payload.jitsi_domain = "meet.jit.si";
        }
        const { data, error } = await supabase
          .from("building_online_meetings" as any)
          .insert({
            ...payload,
            building_id: buildingId,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        toast.success("جلسه ایجاد شد و اطلاع‌رسانی انجام می‌شود");
        if (data) await notifyResidents(data as unknown as OnlineMeeting);
      }

      setDialogOpen(false); resetForm();
      qc.invalidateQueries({ queryKey: ["online_meetings", buildingId] });
    } catch (e: any) {
      toast.error(e.message || "خطا در ثبت جلسه");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (m: OnlineMeeting) => {
      const { error } = await supabase
        .from("building_online_meetings" as any)
        .delete()
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("جلسه حذف شد");
      qc.invalidateQueries({ queryKey: ["online_meetings", buildingId] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message || "خطا در حذف"),
  });

  const copyLink = (m: OnlineMeeting) => {
    const link = buildLink(m.jitsi_domain, m.room_name);
    if (!link) return;
    navigator.clipboard.writeText(link).then(
      () => toast.success("لینک کپی شد"),
      () => toast.error("کپی ناموفق بود")
    );
  };

  const inviteeCount = (m: OnlineMeeting) => {
    const exO = new Set(m.excluded_owner_unit_ids || []);
    const exR = new Set(m.excluded_resident_unit_ids || []);
    const includeO = m.audience === "owners" || m.audience === "both";
    const includeR = m.audience === "residents" || m.audience === "both";
    let count = 0;
    units.forEach(u => {
      if (includeO && u.phone && !exO.has(u.id)) count++;
      if (includeR && u.resident_phone && u.resident_phone !== u.phone && !exR.has(u.id)) count++;
    });
    return count;
  };

  const renderCard = (m: OnlineMeeting) => {
    const d = new Date(m.scheduled_at);
    const link = buildLink(m.jitsi_domain, m.room_name);
    const isLive = Math.abs(d.getTime() - now) < 2 * 3600 * 1000;
    const exCount = (m.excluded_owner_unit_ids?.length || 0) + (m.excluded_resident_unit_ids?.length || 0);
    const onlineAvailable = m.has_online !== false && !!link;
    return (
      <Card key={m.id} className={isLive ? "border-primary/40 bg-primary/5" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{m.title}</span>
                {isLive && <span className="text-xs bg-primary text-primary-foreground rounded px-2 py-0.5">در حال برگزاری/نزدیک</span>}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatJalaliDate(d.toISOString())}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pad(d.getHours())}:{pad(d.getMinutes())}</span>
                {m.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{m.location}</span>
                )}
                <Badge variant="secondary" className="gap-1">
                  <Users className="w-3 h-3" />
                  {audienceLabel(m.audience || "both")}
                </Badge>
                {onlineAvailable && (
                  <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                    <Video className="w-3 h-3" />
                    حضور آنلاین
                  </Badge>
                )}
                <span>مدعوین: {inviteeCount(m)} نفر{exCount > 0 ? ` • ${exCount} استثنا` : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {onlineAvailable && (
                <>
                  <Button size="sm" onClick={() => window.open(link, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    ورود آنلاین
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyLink(m)}>
                    <Copy className="w-3.5 h-3.5 ml-1" />
                    کپی لینک
                  </Button>
                </>
              )}
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(m)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        {m.description && (
          <CardContent className="pt-0">
            <div className="text-sm whitespace-pre-wrap leading-7 bg-muted/30 rounded-md p-3">
              {m.description}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const showOwnersList = audience === "owners" || audience === "both";
  const showResidentsList = audience === "residents" || audience === "both";

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">جلسه</h2>
          <p className="text-muted-foreground text-sm mt-1">
            جلسات به‌صورت حضوری در مکان تعیین‌شده برگزار می‌شود. در صورت تمایل می‌توانید گزینه حضور آنلاین (meet.jit.si) را نیز برای کسانی که امکان حضور فیزیکی ندارند فعال کنید.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 ml-1" />
            جلسه جدید
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-3 opacity-30" />
            <p>جلسه‌ای برنامه‌ریزی نشده است</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">آینده</h3>
              <div className="space-y-3">{upcoming.map(renderCard)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">گذشته</h3>
              <div className="space-y-3 opacity-80">{past.map(renderCard)}</div>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش جلسه" : "ایجاد جلسه"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان جلسه *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: جلسه عمومی هیئت‌مدیره" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تاریخ *</Label>
                <JalaliDatePicker value={meetingDate} onChange={setMeetingDate} />
              </div>
              <div className="space-y-2">
                <Label>ساعت *</Label>
                <Input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} dir="ltr" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> مکان برگزاری *</Label>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="مثال: لابی ساختمان، طبقه همکف"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-sm flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" /> حضور آنلاین (اختیاری)
                </Label>
                <p className="text-xs text-muted-foreground">
                  در صورت فعال‌سازی، یک لینک جلسه آنلاین برای کسانی که امکان حضور فیزیکی ندارند ایجاد می‌شود.
                </p>
              </div>
              <Switch checked={hasOnline} onCheckedChange={setHasOnline} />
            </div>

            <div className="space-y-2">
              <Label>توضیحات (اختیاری)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="دستور جلسه، نکات و..." className="min-h-20" />
            </div>

            <div className="space-y-2">
              <Label>دعوت‌شدگان *</Label>
              <RadioGroup
                value={audience}
                onValueChange={(v) => setAudience(v as Audience)}
                className="flex gap-4 flex-wrap"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="both" id="aud-both" />
                  <span className="text-sm">مالکین و ساکنین</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="owners" id="aud-owners" />
                  <span className="text-sm">فقط مالکین</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="residents" id="aud-residents" />
                  <span className="text-sm">فقط ساکنین</span>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="block">استثناها (تیک‌خورده‌ها از دعوت حذف می‌شوند)</Label>

              {showOwnersList && (
                <div className="border rounded-md p-3 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">مالکین ({ownerCandidates.length})</div>
                    <div className="flex gap-2 text-xs">
                      <button type="button" className="text-primary hover:underline" onClick={() => setExcludedOwners(new Set())}>پاک‌کردن استثنا</button>
                      <span className="text-muted-foreground">•</span>
                      <button type="button" className="text-destructive hover:underline" onClick={() => setExcludedOwners(new Set(ownerCandidates.map(u => u.id)))}>استثنای همه</button>
                    </div>
                  </div>
                  {ownerCandidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">مالک با شماره تماس ثبت‌شده‌ای وجود ندارد</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-auto">
                      {ownerCandidates.map(u => {
                        const isExcluded = excludedOwners.has(u.id);
                        return (
                          <label key={`o-${u.id}`} className={`flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 transition-colors ${isExcluded ? "bg-destructive/10 text-destructive" : ""}`}>
                            <Checkbox
                              checked={isExcluded}
                              onCheckedChange={() => toggleExcl(excludedOwners, setExcludedOwners, u.id)}
                            />
                            <span className="truncate">واحد {u.unit_number} — {u.owner_name || "—"}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {showResidentsList && (
                <div className="border rounded-md p-3 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">ساکنین ({residentCandidates.length})</div>
                    <div className="flex gap-2 text-xs">
                      <button type="button" className="text-primary hover:underline" onClick={() => setExcludedResidents(new Set())}>پاک‌کردن استثنا</button>
                      <span className="text-muted-foreground">•</span>
                      <button type="button" className="text-destructive hover:underline" onClick={() => setExcludedResidents(new Set(residentCandidates.map(u => u.id)))}>استثنای همه</button>
                    </div>
                  </div>
                  {residentCandidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">ساکن با شماره تماس مستقل از مالک وجود ندارد</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-auto">
                      {residentCandidates.map(u => {
                        const isExcluded = excludedResidents.has(u.id);
                        return (
                          <label key={`r-${u.id}`} className={`flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 transition-colors ${isExcluded ? "bg-destructive/10 text-destructive" : ""}`}>
                            <Checkbox
                              checked={isExcluded}
                              onCheckedChange={() => toggleExcl(excludedResidents, setExcludedResidents, u.id)}
                            />
                            <span className="truncate">واحد {u.unit_number} — {u.resident_name || "—"}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
              با ذخیره جلسه، یک اعلان سنجاق‌شده درج می‌شود و در صورت فعال‌بودن سرویس پیامک، دعوتنامه فقط برای گروه انتخابی (به‌جز افراد استثنا) ارسال می‌شود.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>انصراف</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
              ذخیره و اطلاع‌رسانی
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف جلسه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.title}» مطمئن هستید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
