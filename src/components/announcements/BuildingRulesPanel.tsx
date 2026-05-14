import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ScrollText, Save, Pencil, X, Upload, FileText, Download, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  buildingId: string;
  /** آیا کاربر فعلی اجازه ویرایش دارد (مدیر) */
  canEdit?: boolean;
}

export function BuildingRulesPanel({ buildingId, canEdit = false }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rule, isLoading } = useQuery({
    queryKey: ["building_rules", buildingId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("building_rules")
        .select("*")
        .eq("building_id", buildingId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; content: string; updated_at: string; pdf_path: string | null; pdf_name: string | null } | null;
    },
    enabled: !!buildingId,
  });

  useEffect(() => {
    if (!editing) setDraft(rule?.content || "");
  }, [rule, editing]);

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      if (rule) {
        const { error } = await (supabase as any)
          .from("building_rules")
          .update({ content, updated_by: user?.id })
          .eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("building_rules")
          .insert({ building_id: buildingId, content, updated_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "ذخیره شد", description: "مقررات ساختمان به‌روزرسانی شد" });
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["building_rules", buildingId] });
    },
    onError: (e: any) => {
      toast({ title: "خطا در ذخیره", description: e.message, variant: "destructive" });
    },
  });

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "فرمت نامعتبر", description: "فقط فایل PDF مجاز است", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "حجم زیاد", description: "حداکثر حجم فایل ۲۰ مگابایت", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Remove old file if exists
      if (rule?.pdf_path) {
        await supabase.storage.from("building-rules").remove([rule.pdf_path]);
      }
      const path = `${buildingId}/rules-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("building-rules")
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      if (rule) {
        const { error } = await (supabase as any)
          .from("building_rules")
          .update({ pdf_path: path, pdf_name: file.name, updated_by: user?.id })
          .eq("id", rule.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("building_rules")
          .insert({ building_id: buildingId, content: "", pdf_path: path, pdf_name: file.name, updated_by: user?.id });
        if (error) throw error;
      }
      toast({ title: "آپلود شد", description: "فایل PDF مقررات بارگذاری شد" });
      qc.invalidateQueries({ queryKey: ["building_rules", buildingId] });
    } catch (e: any) {
      toast({ title: "خطا در آپلود", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePdfDownload = async () => {
    if (!rule?.pdf_path) return;
    const { data, error } = await supabase.storage
      .from("building-rules")
      .createSignedUrl(rule.pdf_path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: "خطا", description: "دانلود فایل ناموفق بود", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handlePdfDelete = async () => {
    if (!rule?.pdf_path) return;
    if (!confirm("فایل PDF مقررات حذف شود؟")) return;
    try {
      await supabase.storage.from("building-rules").remove([rule.pdf_path]);
      const { error } = await (supabase as any)
        .from("building_rules")
        .update({ pdf_path: null, pdf_name: null, updated_by: user?.id })
        .eq("id", rule.id);
      if (error) throw error;
      toast({ title: "حذف شد", description: "فایل PDF حذف شد" });
      qc.invalidateQueries({ queryKey: ["building_rules", buildingId] });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="w-5 h-5 text-primary" />
            مقررات ساختمان
          </CardTitle>
          {rule?.updated_at && (
            <p className="text-xs text-muted-foreground mt-1">
              آخرین به‌روزرسانی: {formatJalaliDate(rule.updated_at)}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {canEdit && !editing && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdfUpload(f);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 ml-1" />
                )}
                {rule?.pdf_path ? "تعویض PDF" : "آپلود PDF"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 ml-1" />
                ویرایش متن
              </Button>
            </>
          )}
          {canEdit && editing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setDraft(rule?.content || "");
                }}
                disabled={saveMutation.isPending}
              >
                <X className="w-4 h-4 ml-1" />
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 ml-1" />
                )}
                ذخیره
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rule?.pdf_path && (
          <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm flex-1 truncate">{rule.pdf_name || "مقررات.pdf"}</span>
            <Button variant="ghost" size="sm" onClick={handlePdfDownload}>
              <Download className="w-4 h-4 ml-1" />
              دانلود
            </Button>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={handlePdfDelete} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="متن مقررات و قوانین ساختمان را وارد کنید..."
            className="min-h-[400px] text-sm leading-relaxed"
            dir="rtl"
          />
        ) : rule?.content ? (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed text-sm">{rule.content}</p>
          </div>
        ) : !rule?.pdf_path ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ScrollText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">
              {canEdit
                ? "هنوز مقرراتی ثبت نشده است. متن وارد کنید یا فایل PDF آپلود نمایید."
                : "هنوز مقرراتی توسط مدیریت ثبت نشده است."}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
