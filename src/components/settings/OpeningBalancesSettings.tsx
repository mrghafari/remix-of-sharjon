import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Wallet, Users, Info } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBuilding } from "@/contexts/BuildingContext";
import { useUnits } from "@/hooks/useUnits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

const todayJalali = () => {
  const d = new Date();
  return {
    month: Number(format(d, "M", { locale: faIR })),
    year: Number(format(d, "yyyy", { locale: faIR })),
    iso: d.toISOString().split("T")[0],
  };
};

// Marker stored in description to flag rows as opening balances (not income).
const OPENING_MARKER = "مبلغ اولیه";

type UnitRow = { cd: string; cc: string; ed: string; ec: string };
const emptyRow: UnitRow = { cd: "", cc: "", ed: "", ec: "" };

export function OpeningBalancesSettings() {
  const { currentBuildingId } = useBuilding();
  const { data: units = [] } = useUnits();
  const queryClient = useQueryClient();

  const [fundCharge, setFundCharge] = useState("");
  const [fundExtra, setFundExtra] = useState("");
  const [fundSaving, setFundSaving] = useState(false);

  const [unitValues, setUnitValues] = useState<Record<string, UnitRow>>({});
  const [unitsSaving, setUnitsSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load existing opening balances so the user can review / edit later.
  useEffect(() => {
    if (!currentBuildingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: pays }, { data: charges }] = await Promise.all([
          supabase
            .from("payments")
            .select("unit_id, amount, fund_type")
            .eq("building_id", currentBuildingId)
            .eq("description", OPENING_MARKER),
          supabase
            .from("unit_charges")
            .select("unit_id, amount, fund_type")
            .eq("building_id", currentBuildingId)
            .eq("description", OPENING_MARKER),
        ]);

        if (cancelled) return;

        let fc = 0;
        let fe = 0;
        const map: Record<string, UnitRow> = {};

        for (const p of pays || []) {
          if (!p.unit_id) {
            if (p.fund_type === "charge") fc += Number(p.amount);
            else fe += Number(p.amount);
          } else {
            const r = map[p.unit_id] || { ...emptyRow };
            if (p.fund_type === "charge") r.cc = String(Math.round(Number(p.amount)));
            else r.ec = String(Math.round(Number(p.amount)));
            map[p.unit_id] = r;
          }
        }
        for (const c of charges || []) {
          if (!c.unit_id) continue;
          const r = map[c.unit_id] || { ...emptyRow };
          if (c.fund_type === "charge") r.cd = String(Math.round(Number(c.amount)));
          else r.ed = String(Math.round(Number(c.amount)));
          map[c.unit_id] = r;
        }

        setFundCharge(fc > 0 ? String(fc) : "");
        setFundExtra(fe > 0 ? String(fe) : "");
        setUnitValues(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentBuildingId]);

  const updateUnitField = (
    unitId: string,
    field: keyof UnitRow,
    value: string
  ) => {
    setUnitValues((prev) => {
      const cur = prev[unitId] || { ...emptyRow };
      const next: UnitRow = { ...cur, [field]: value };
      // Mutual exclusivity: when debt is entered, clear credit (and vice-versa) per fund.
      const num = Number(value || 0);
      if (num > 0) {
        if (field === "cd") next.cc = "";
        else if (field === "cc") next.cd = "";
        else if (field === "ed") next.ec = "";
        else if (field === "ec") next.ed = "";
      }
      return { ...prev, [unitId]: next };
    });
  };

  const handleSaveFunds = async () => {
    if (!currentBuildingId) return;
    const charge = Math.round(Number(fundCharge || 0));
    const extra = Math.round(Number(fundExtra || 0));
    setFundSaving(true);
    try {
      // Replace previous fund opening rows
      await supabase
        .from("payments")
        .delete()
        .eq("building_id", currentBuildingId)
        .is("unit_id", null)
        .eq("description", OPENING_MARKER);

      const t = todayJalali();
      const rows: any[] = [];
      if (charge > 0) {
        rows.push({
          building_id: currentBuildingId,
          unit_id: null,
          amount: charge,
          fund_type: "charge",
          payment_date: t.iso,
          month: t.month,
          year: t.year,
          description: OPENING_MARKER,
        });
      }
      if (extra > 0) {
        rows.push({
          building_id: currentBuildingId,
          unit_id: null,
          amount: extra,
          fund_type: "extra_charge",
          payment_date: t.iso,
          month: t.month,
          year: t.year,
          description: OPENING_MARKER,
        });
      }
      if (rows.length > 0) {
        const { error } = await supabase.from("payments").insert(rows);
        if (error) throw error;
      }
      toast({ title: "ذخیره شد", description: "مبالغ اولیه صندوق‌ها به‌روزرسانی شد" });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (e: any) {
      toast({ title: "خطا", description: e?.message || "خطا در ذخیره", variant: "destructive" });
    } finally {
      setFundSaving(false);
    }
  };

  const handleSaveUnit = async (unitId: string) => {
    if (!currentBuildingId) return;
    const v = unitValues[unitId] || { ...emptyRow };
    const cd = Math.round(Number(v.cd || 0));
    const cc = Math.round(Number(v.cc || 0));
    const ed = Math.round(Number(v.ed || 0));
    const ec = Math.round(Number(v.ec || 0));
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;

    setUnitsSaving((p) => ({ ...p, [unitId]: true }));
    try {
      // Always clear previous opening rows for this unit, then insert fresh ones.
      await Promise.all([
        supabase
          .from("unit_charges")
          .delete()
          .eq("building_id", currentBuildingId)
          .eq("unit_id", unitId)
          .eq("description", OPENING_MARKER),
        supabase
          .from("payments")
          .delete()
          .eq("building_id", currentBuildingId)
          .eq("unit_id", unitId)
          .eq("description", OPENING_MARKER),
      ]);

      const t = todayJalali();
      const base = {
        building_id: currentBuildingId,
        unit_id: unitId,
        month: t.month,
        year: t.year,
        owner_name: unit.owner_name || null,
        resident_name: unit.resident_name || null,
        description: OPENING_MARKER,
      };

      const newCharges: any[] = [];
      const newPayments: any[] = [];
      if (cd > 0) newCharges.push({ ...base, amount: cd, fund_type: "charge" });
      if (ed > 0) newCharges.push({ ...base, amount: ed, fund_type: "extra_charge" });
      if (cc > 0) newPayments.push({ ...base, amount: cc, fund_type: "charge", payment_date: t.iso });
      if (ec > 0) newPayments.push({ ...base, amount: ec, fund_type: "extra_charge", payment_date: t.iso });

      if (newCharges.length > 0) {
        const { error } = await supabase.from("unit_charges").insert(newCharges);
        if (error) throw error;
      }
      if (newPayments.length > 0) {
        const { error } = await supabase.from("payments").insert(newPayments);
        if (error) throw error;
      }

      toast({ title: "ذخیره شد", description: `واحد ${unit.unit_number} به‌روزرسانی شد` });
      queryClient.invalidateQueries({ queryKey: ["unit-charges"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (e: any) {
      toast({ title: "خطا", description: e?.message || "خطا در ذخیره", variant: "destructive" });
    } finally {
      setUnitsSaving((p) => ({ ...p, [unitId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm">
          مقادیر این بخش به‌عنوان «مبلغ اولیه» در سامانه ذخیره می‌شوند (نه به‌عنوان درآمد عادی) و در گزارش‌های مالی به‌عنوان مانده ابتدای دوره لحاظ خواهند شد. می‌توانید بعداً مقادیر را تغییر دهید؛ مقدار قبلی جایگزین می‌شود. برای هر واحد در هر صندوق فقط یکی از دو فیلد «بدهی» یا «بستانکاری» قابل ورود است.
        </AlertDescription>
      </Alert>

      {/* Fund opening balances */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            مبالغ اولیه صندوق‌ها
          </CardTitle>
          <CardDescription>
            مانده نقدی موجود در هر صندوق در ابتدای راه‌اندازی یا مهاجرت سیستم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>مبلغ اولیه صندوق شارژ (ریال)</Label>
              <NumericInput value={fundCharge} onChange={setFundCharge} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>مبلغ اولیه صندوق شارژ فوق‌العاده (ریال)</Label>
              <NumericInput value={fundExtra} onChange={setFundExtra} placeholder="0" />
            </div>
          </div>
          <Button onClick={handleSaveFunds} disabled={fundSaving || loading}>
            {fundSaving ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Save className="w-4 h-4 ml-2" />
            )}
            ذخیره مبالغ صندوق‌ها
          </Button>
        </CardContent>
      </Card>

      {/* Unit opening balances */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            مبالغ اولیه واحدها
          </CardTitle>
          <CardDescription>
            برای هر واحد، در هر صندوق فقط یکی از فیلدهای بدهی یا بستانکاری اولیه قابل ورود است. دکمه ذخیره را برای هر واحد جداگانه بزنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : units.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ابتدا واحدها را ثبت کنید</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">واحد</TableHead>
                    <TableHead className="text-right">مالک / ساکن</TableHead>
                    <TableHead className="text-right">بدهی شارژ</TableHead>
                    <TableHead className="text-right">بستانکاری شارژ</TableHead>
                    <TableHead className="text-right">بدهی شارژ فوق‌العاده</TableHead>
                    <TableHead className="text-right">بستانکاری شارژ فوق‌العاده</TableHead>
                    <TableHead className="text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => {
                    const v = unitValues[u.id] || { ...emptyRow };
                    const ccDisabled = Number(v.cd || 0) > 0;
                    const cdDisabled = Number(v.cc || 0) > 0;
                    const ecDisabled = Number(v.ed || 0) > 0;
                    const edDisabled = Number(v.ec || 0) > 0;
                    const busy = !!unitsSaving[u.id];
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-bold text-primary">{u.unit_number}</TableCell>
                        <TableCell className="text-sm">
                          <div>{u.owner_name}</div>
                          {u.resident_name && (
                            <div className="text-muted-foreground text-xs">{u.resident_name}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <NumericInput
                            value={v.cd}
                            onChange={(val) => updateUnitField(u.id, "cd", val)}
                            placeholder="0"
                            className="w-32"
                            disabled={cdDisabled}
                          />
                        </TableCell>
                        <TableCell>
                          <NumericInput
                            value={v.cc}
                            onChange={(val) => updateUnitField(u.id, "cc", val)}
                            placeholder="0"
                            className="w-32"
                            disabled={ccDisabled}
                          />
                        </TableCell>
                        <TableCell>
                          <NumericInput
                            value={v.ed}
                            onChange={(val) => updateUnitField(u.id, "ed", val)}
                            placeholder="0"
                            className="w-32"
                            disabled={edDisabled}
                          />
                        </TableCell>
                        <TableCell>
                          <NumericInput
                            value={v.ec}
                            onChange={(val) => updateUnitField(u.id, "ec", val)}
                            placeholder="0"
                            className="w-32"
                            disabled={ecDisabled}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveUnit(u.id)}
                            disabled={busy}
                          >
                            {busy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5 ml-1" />
                                ذخیره
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
