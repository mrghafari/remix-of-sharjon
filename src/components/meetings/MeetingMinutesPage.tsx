import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { toast } from "sonner";
import { FileText, Plus, Search, Download, Trash2, Pencil, Calendar, Loader2, Paperclip, PenLine, CheckCircle2, Users, Lock, ShieldCheck } from "lucide-react";
import { sendSmsBatch } from "@/hooks/useSms";

interface MeetingMinute {
  id: string;
  building_id: string;
  title: string;
  meeting_date: string;
  content: string | null;
  pdf_file_path: string | null;
  pdf_file_name: string | null;
  pdf_file_size: number;
  created_at: string;
  is_finalized?: boolean;
  finalized_at?: string | null;
}

interface Signature {
  id: string;
  meeting_minute_id: string;
  unit_id: string | null;
  user_id: string;
  person_name: string | null;
  person_role: string | null;
  person_phone: string | null;
  signed_at: string;
}

interface ResidentContext {
  unitId: string;
  role: "owner" | "resident";
  personName?: string;
  personPhone?: string;
}

interface Props {
  buildingId?: string;
  canEdit?: boolean;
  residentContext?: ResidentContext;
}

export function MeetingMinutesPage({ buildingId: propBuildingId, canEdit = true, residentContext }: Props) {
  const { currentBuildingId } = useBuilding();
  const buildingId = propBuildingId || currentBuildingId;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingMinute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeetingMinute | null>(null);
  const [signersDialog, setSignersDialog] = useState<MeetingMinute | null>(null);
  const [signConfirmTarget, setSignConfirmTarget] = useState<MeetingMinute | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<MeetingMinute | null>(null);
  const [signing, setSigning] = useState(false);

  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date());
  const [content, setContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: minutes = [], isLoading } = useQuery({
    queryKey: ["meeting_minutes", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_meeting_minutes" as any)
        .select("*")
        .eq("building_id", buildingId!)
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MeetingMinute[];
    },
    enabled: !!buildingId,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["meeting_minute_signatures", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minute_signatures" as any)
        .select("*")
        .eq("building_id", buildingId!)
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Signature[];
    },
    enabled: !!buildingId,
  });

  const signaturesByMinute = useMemo(() => {
    const map = new Map<string, Signature[]>();
    for (const s of signatures) {
      const arr = map.get(s.meeting_minute_id) || [];
      arr.push(s);
      map.set(s.meeting_minute_id, arr);
    }
    return map;
  }, [signatures]);

  const myUserId = user?.id;
  const isSignedByMe = (mid: string) =>
    !!myUserId && signatures.some(s => s.meeting_minute_id === mid && s.user_id === myUserId);

  const filtered = useMemo(() => {
    if (!search.trim()) return minutes;
    const q = search.trim().toLowerCase();
    return minutes.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.content || "").toLowerCase().includes(q)
    );
  }, [minutes, search]);

  const resetForm = () => {
    setTitle("");
    setMeetingDate(new Date());
    setContent("");
    setPdfFile(null);
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (m: MeetingMinute) => {
    setEditing(m);
    setTitle(m.title);
    setMeetingDate(new Date(m.meeting_date));
    setContent(m.content || "");
    setPdfFile(null);
    setDialogOpen(true);
  };

  const notifyResidentsToSign = async (m: MeetingMinute, isUpdate = false) => {
    try {
      const { data: units } = await supabase
        .from("units")
        .select("id, unit_number, owner_name, resident_name, phone, resident_phone")
        .eq("building_id", buildingId!);

      const dateStr = formatJalaliDate(m.meeting_date);
      const vars = { "عنوان": m.title, "تاریخ": dateStr, "ساختمان": "" };

      const recipients: any[] = [];
      (units || []).forEach((u: any) => {
        if (u.phone) recipients.push({ phone: u.phone, name: u.owner_name || "همسایه گرامی", role: "owner", unit_id: u.id, variables: { ...vars, "نام": u.owner_name || "" } });
        if (u.resident_phone && u.resident_phone !== u.phone) {
          recipients.push({ phone: u.resident_phone, name: u.resident_name || "همسایه گرامی", role: "resident", unit_id: u.id, variables: { ...vars, "نام": u.resident_name || "" } });
        }
      });

      const annTitle = isUpdate ? `ویرایش صورتجلسه: ${m.title}` : `صورتجلسه جدید: ${m.title}`;
      const annContent = isUpdate
        ? `صورتجلسه «${m.title}» مربوط به تاریخ ${dateStr} ویرایش شد. امضاهای قبلی باطل شدند.\nلطفاً پس از مطالعه نسخه جدید، نسبت به امضای مجدد در بخش «جلسات → صورتجلسات» اقدام فرمایید.`
        : `صورتجلسه «${m.title}» مربوط به تاریخ ${dateStr} ثبت شد.\nلطفاً پس از مطالعه، نسبت به امضای الکترونیکی آن در بخش «جلسات → صورتجلسات» اقدام فرمایید.`;

      await (supabase as any).from("building_announcements").insert({
        building_id: buildingId,
        title: annTitle,
        content: annContent,
        is_pinned: true,
        created_by: user?.id,
      });

      if (recipients.length > 0) {
        try {
          await sendSmsBatch({ building_id: buildingId!, template_key: "meeting_minute_sign_invite", recipients });
        } catch (e) {
          console.warn("SMS send failed", e);
        }
      }
    } catch (e) {
      console.warn("Notify failed", e);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !meetingDate || !buildingId || !user) {
      toast.error("عنوان و تاریخ جلسه الزامی است");
      return;
    }
    if (pdfFile && pdfFile.type !== "application/pdf") {
      toast.error("فقط فایل PDF مجاز است");
      return;
    }
    if (pdfFile && pdfFile.size > 20 * 1024 * 1024) {
      toast.error("حجم فایل نباید بیش از ۲۰ مگابایت باشد");
      return;
    }

    setSubmitting(true);
    try {
      let pdf_file_path = editing?.pdf_file_path || null;
      let pdf_file_name = editing?.pdf_file_name || null;
      let pdf_file_size = editing?.pdf_file_size || 0;

      if (pdfFile) {
        const ext = pdfFile.name.split(".").pop() || "pdf";
        const path = `${buildingId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("meeting-minutes")
          .upload(path, pdfFile, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        if (editing?.pdf_file_path) {
          await supabase.storage.from("meeting-minutes").remove([editing.pdf_file_path]);
        }
        pdf_file_path = path;
        pdf_file_name = pdfFile.name;
        pdf_file_size = pdfFile.size;
      }

      const payload = {
        building_id: buildingId,
        title: title.trim(),
        meeting_date: meetingDate.toISOString().split("T")[0],
        content: content.trim() || null,
        pdf_file_path,
        pdf_file_name,
        pdf_file_size,
      };

      if (editing) {
        if (editing.is_finalized) {
          throw new Error("صورتجلسه نهایی شده است و قابل ویرایش نیست");
        }
        const hadSignatures = (signaturesByMinute.get(editing.id) || []).length > 0;
        const contentChanged =
          editing.title !== payload.title ||
          editing.meeting_date !== payload.meeting_date ||
          (editing.content || "") !== (payload.content || "") ||
          (editing.pdf_file_path || "") !== (payload.pdf_file_path || "");

        const { data: updated, error } = await supabase
          .from("building_meeting_minutes" as any)
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw error;

        if (contentChanged && hadSignatures) {
          toast.success("صورتجلسه به‌روزرسانی شد. امضاهای قبلی باطل شدند و اطلاع‌رسانی مجدد ارسال می‌شود.");
          if (updated) await notifyResidentsToSign(updated as unknown as MeetingMinute, true);
        } else {
          toast.success("صورتجلسه به‌روزرسانی شد");
        }
      } else {
        const { data, error } = await supabase
          .from("building_meeting_minutes" as any)
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        toast.success("صورتجلسه ثبت شد و اطلاع‌رسانی به اهالی انجام می‌شود");
        if (data) await notifyResidentsToSign(data as unknown as MeetingMinute);
      }

      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["meeting_minutes", buildingId] });
      queryClient.invalidateQueries({ queryKey: ["meeting_minute_signatures", buildingId] });
    } catch (e: any) {
      toast.error(e.message || "خطا در ثبت صورتجلسه");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (m: MeetingMinute) => {
      if (m.pdf_file_path) {
        await supabase.storage.from("meeting-minutes").remove([m.pdf_file_path]);
      }
      const { error } = await supabase
        .from("building_meeting_minutes" as any)
        .delete()
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("صورتجلسه حذف شد");
      queryClient.invalidateQueries({ queryKey: ["meeting_minutes", buildingId] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message || "خطا در حذف"),
  });

  const finalizeMutation = useMutation({
    mutationFn: async (m: MeetingMinute) => {
      const { error } = await supabase
        .from("building_meeting_minutes" as any)
        .update({ is_finalized: true, finalized_at: new Date().toISOString(), finalized_by: user?.id })
        .eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("صورتجلسه نهایی شد. دیگر قابل ویرایش نیست اما اهالی امضا نکرده می‌توانند امضا کنند.");
      queryClient.invalidateQueries({ queryKey: ["meeting_minutes", buildingId] });
      setFinalizeTarget(null);
    },
    onError: (e: any) => toast.error(e.message || "خطا در نهایی‌سازی"),
  });

  const handleSign = async (m: MeetingMinute) => {
    if (!user || !buildingId) {
      toast.error("برای امضا باید وارد حساب کاربری باشید");
      return;
    }
    setSigning(true);
    try {
      const { error } = await (supabase as any)
        .from("meeting_minute_signatures")
        .insert({
          meeting_minute_id: m.id,
          building_id: buildingId,
          unit_id: residentContext?.unitId || null,
          user_id: user.id,
          person_name: residentContext?.personName || null,
          person_role: residentContext?.role || null,
          person_phone: residentContext?.personPhone || null,
        });
      if (error) throw error;
      toast.success("صورتجلسه با موفقیت امضا شد");
      setSignConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["meeting_minute_signatures", buildingId] });
    } catch (e: any) {
      if (e.code === "23505") {
        toast.info("شما قبلاً این صورتجلسه را امضا کرده‌اید");
        setSignConfirmTarget(null);
      } else {
        toast.error(e.message || "خطا در ثبت امضا");
      }
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = async (m: MeetingMinute) => {
    if (!m.pdf_file_path) return;
    const { data, error } = await supabase.storage
      .from("meeting-minutes")
      .createSignedUrl(m.pdf_file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("خطا در دریافت فایل");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === q.toLowerCase()
        ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{p}</mark>
        : <span key={i}>{p}</span>
    );
  };

  const roleLabel = (r: string | null) => r === "owner" ? "مالک" : r === "resident" ? "ساکن" : "—";

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">صورتجلسات ساختمان</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {canEdit
              ? "آرشیو، جستجو و دانلود صورتجلسات. پس از ثبت، اهالی برای امضای الکترونیکی دعوت می‌شوند."
              : "صورتجلسات را مطالعه کرده و در صورت تأیید، الکترونیکی امضا کنید."}
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 ml-1" />
            صورتجلسه جدید
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="جستجو در عنوان و متن صورتجلسات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p>{search ? "نتیجه‌ای یافت نشد" : "صورتجلسه‌ای ثبت نشده است"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const sigs = signaturesByMinute.get(m.id) || [];
            const signed = isSignedByMe(m.id);
            return (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span>{highlight(m.title, search)}</span>
                        {m.pdf_file_path && <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />}
                        {m.is_finalized && (
                          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100">
                            <Lock className="w-3 h-3" /> نهایی شده
                          </Badge>
                        )}
                        {signed && (
                          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle2 className="w-3 h-3" /> امضا شده توسط شما
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          تاریخ جلسه: {formatJalaliDate(m.meeting_date)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSignersDialog(m)}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {sigs.length} امضا
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {m.pdf_file_path && (
                        <Button variant="outline" size="sm" onClick={() => handleDownload(m)}>
                          <Download className="w-3.5 h-3.5 ml-1" />
                          دانلود PDF
                        </Button>
                      )}
                      {!canEdit && !signed && (
                        <Button size="sm" onClick={() => setSignConfirmTarget(m)}>
                          <PenLine className="w-3.5 h-3.5 ml-1" />
                          امضای الکترونیکی
                        </Button>
                      )}
                      {canEdit && (
                        <>
                          {!m.is_finalized && sigs.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                              onClick={() => setFinalizeTarget(m)}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              نهایی‌سازی امضاها
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(m)}
                            disabled={m.is_finalized}
                            title={m.is_finalized ? "صورتجلسه نهایی شده و قابل ویرایش نیست" : "ویرایش"}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(m)}
                            disabled={m.is_finalized}
                            title={m.is_finalized ? "صورتجلسه نهایی شده و قابل حذف نیست" : "حذف"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {m.content && (
                  <CardContent className="pt-0">
                    <div className="text-sm whitespace-pre-wrap leading-7 bg-muted/30 rounded-md p-3 max-h-60 overflow-auto">
                      {highlight(m.content, search)}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش صورتجلسه" : "ثبت صورتجلسه جدید"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان جلسه *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: جلسه عمومی هیئت‌مدیره" />
            </div>
            <div className="space-y-2">
              <Label>تاریخ جلسه *</Label>
              <JalaliDatePicker value={meetingDate} onChange={setMeetingDate} />
            </div>
            <div className="space-y-2">
              <Label>متن صورتجلسه (قابل جستجو)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="متن کامل صورتجلسه را اینجا وارد کنید..."
                className="min-h-40"
              />
            </div>
            <div className="space-y-2">
              <Label>فایل PDF (اختیاری)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
              {editing?.pdf_file_name && !pdfFile && (
                <p className="text-xs text-muted-foreground">فایل فعلی: {editing.pdf_file_name}</p>
              )}
            </div>
            {!editing && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                با ثبت صورتجلسه، یک اعلان سنجاق‌شده در داشبورد ساکنین درج می‌شود و در صورت فعال‌بودن سرویس پیامک، دعوت به امضای الکترونیکی برای همه اهالی ارسال خواهد شد.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>انصراف</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف صورتجلسه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.title}» مطمئن هستید؟ تمام امضاهای ثبت‌شده نیز حذف خواهند شد و این عمل قابل بازگشت نیست.
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

      <AlertDialog open={!!signConfirmTarget} onOpenChange={(o) => !o && setSignConfirmTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید امضای الکترونیکی</AlertDialogTitle>
            <AlertDialogDescription>
              با امضای صورتجلسه «{signConfirmTarget?.title}»، اعلام می‌کنید که محتوای آن را مطالعه و تأیید می‌نمایید. این امضا با نام و شناسه کاربری شما ثبت می‌شود و قابل برگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signing}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={signing}
              onClick={(e) => { e.preventDefault(); signConfirmTarget && handleSign(signConfirmTarget); }}
            >
              {signing && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
              تأیید و امضا
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!signersDialog} onOpenChange={(o) => !o && setSignersDialog(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>امضاکنندگان صورتجلسه</DialogTitle>
            <DialogDescription>{signersDialog?.title}</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto space-y-2">
            {(signersDialog ? signaturesByMinute.get(signersDialog.id) || [] : []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">هنوز هیچ امضایی ثبت نشده است</p>
            ) : (
              (signersDialog ? signaturesByMinute.get(signersDialog.id) || [] : []).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium">{s.person_name || "بدون نام"}</div>
                      <div className="text-xs text-muted-foreground">{roleLabel(s.person_role)} {s.person_phone ? `• ${s.person_phone}` : ""}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatJalaliDate(s.signed_at)}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
