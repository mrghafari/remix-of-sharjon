import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  unitId: string;
  role: "owner" | "resident";
}

export function ResidentProfile({ unitId, role }: Props) {
  const queryClient = useQueryClient();
  const [secondary, setSecondary] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: unit, isLoading } = useQuery({
    queryKey: ["resident_unit_profile", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select(
          "id, unit_number, owner_name, phone, phone_secondary, resident_name, resident_phone, resident_phone_secondary, landline_phone"
        )
        .eq("id", unitId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!unit) return;
    setSecondary(
      (role === "owner" ? unit.phone_secondary : unit.resident_phone_secondary) || ""
    );
  }, [unit, role]);

  const save = async (value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("resident_update_secondary_phone", {
        _unit_id: unitId,
        _role: role,
        _phone: value,
      });
      if (error) throw error;
      toast.success("شماره دوم ذخیره شد");
      queryClient.invalidateQueries({ queryKey: ["resident_unit_profile", unitId] });
      queryClient.invalidateQueries({ queryKey: ["resident_units"] });
    } catch (e: any) {
      toast.error(e?.message || "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !unit) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const primaryPhone = role === "owner" ? unit.phone : unit.resident_phone;
  const name = role === "owner" ? unit.owner_name : unit.resident_name;

  return (
    <div className="max-w-2xl mx-auto space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            مشخصات {role === "owner" ? "مالک" : "ساکن"} — واحد {unit.unit_number}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input value={name || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>شماره اصلی</Label>
              <Input value={primaryPhone || ""} disabled dir="ltr" className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary">شماره دوم</Label>
            <div className="flex gap-2">
              <Input
                id="secondary"
                type="tel"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                maxLength={15}
                dir="ltr"
                placeholder="مثلاً 0912xxxxxxx"
              />
              <Button onClick={() => save(secondary)} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                ذخیره
              </Button>
              {secondary && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSecondary("");
                    save("");
                  }}
                  disabled={saving}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              این شماره به‌عنوان شماره دوم در کنار شماره اصلی شما ثبت می‌شود.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
