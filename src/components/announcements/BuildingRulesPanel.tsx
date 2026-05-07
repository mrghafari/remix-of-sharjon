import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ScrollText, Save, Pencil, X } from "lucide-react";
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

  const { data: rule, isLoading } = useQuery({
    queryKey: ["building_rules", buildingId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("building_rules")
        .select("*")
        .eq("building_id", buildingId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; content: string; updated_at: string } | null;
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
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4 ml-1" />
            ویرایش
          </Button>
        )}
        {canEdit && editing && (
          <div className="flex gap-2">
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
          </div>
        )}
      </CardHeader>
      <CardContent>
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
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ScrollText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">
              {canEdit
                ? "هنوز مقرراتی ثبت نشده است. برای افزودن، روی «ویرایش» کلیک کنید."
                : "هنوز مقرراتی توسط مدیریت ثبت نشده است."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
