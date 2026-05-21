import { useState } from "react";
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

const OPENING_DESC = "موجودی اولیه (مهاجرت سیستم)";

export function OpeningBalancesSettings() {
  const { currentBuildingId } = useBuilding();
  const { data: units = [] } = useUnits();
  const queryClient = useQueryClient();

  // Fund opening balances
  const [fundCharge, setFundCharge] = useState("");
  const [fundExtra, setFundExtra] = useState("");
  const [fundSaving, setFundSaving] = useState(false);

  // Unit opening balances: { [unitId]: { chargeDebt, chargeCredit, extraDebt, extraCredit } }
  const [unitValues, setUnitValues] = useState<
    Record<string, { cd: string; cc: string; ed: string; ec: string }>
  >({});
  const [unitsSaving, setUnitsSaving] = useState(false);

  const updateUnitField = (
    unitId: string,
    field: "cd" | "cc" | "ed" | "ec",
    value: string
  ) => {
    setUnitValues((prev) => ({
      ...prev,
      [unitId]: { cd: "", cc: "", ed: "", ec: "", ...prev[unitId], [field]: value },
    }));
  };

  const handleSaveFunds = async () => {
    if (!currentBuildingId) return;
    const charge = Math.round(Number(fundCharge || 0));
    const extra = Math.round(Number(fundExtra || 0));
    if (charge <= 0 && extra <= 0) {
      toast({ title: "خطا", description: "حداقل یک مقدار وارد کنید", variant: "destructive" });
      return;
    }
    setFundSaving(true);
    try {
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
          description: OPENING_DESC,
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
          description: OPENING_DESC,
        });
      }
      const { error } = await supabase.from("payments").insert(rows);
      if (error) throw error;
      toast({ title: "ثبت شد", description: "موجودی اولیه صندوق‌ها ذخیره شد" });
      setFundCharge("");
      setFundExtra("");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (e: any) {
      toast({ title: "خطا", description: e?.message || "خطا در ذخیره", variant: "destructive" });
    } finally {
      setFundSaving(false);
    }
  };

  const handleSaveUnits = async () => {
    if (!currentBuildingId) return;
    const t = todayJalali();
    const charges: any[] = [];
    const payments: any[] = [];

    for (const unit of units) {
      const v = unitValues[unit.id];
      if (!v) continue;
      const cd = Math.round(Number(v.cd || 0));
      const cc = Math.round(Number(v.cc || 0));
      const ed = Math.round(Number(v.ed || 0));
      const ec = Math.round(Number(v.ec || 0));

      const baseUnit = {
        building_id: currentBuildingId,
        unit_id: unit.id,
        month: t.month,
        year: t.year,
        owner_name: unit.owner_name || null,
        resident_name: unit.resident_name || null,
      };

      if (cd > 0) {
        charges.push({ ...baseUnit, amount: cd, fund_type: "charge", description: OPENING_DESC });
      }
      if (ed > 0) {
        charges.push({ ...baseUnit, amount: ed, fund_type: "extra_charge", description: OPENING_DESC });
      }
      if (cc > 0) {
        payments.push({
          ...baseUnit,
          amount: cc,
          fund_type: "charge",
          payment_date: t.iso,
          description: OPENING_DESC,
        });
      }
      if (ec > 0) {
        payments.push({
          ...baseUnit,
          amount: ec,
          fund_type: "extra_charge",
          payment_date: t.iso,
          description: OPENING_DESC,
        });
      }
    }

    if (charges.length === 0 && payments.length === 0) {
      toast({ title: "خطا", description: "هیچ مقداری وارد نشده است", variant: "destructive" });
      return;
    }

    setUnitsSaving(true);
    try {
      if (charges.length > 0) {
        const { error } = await supabase.from("unit_charges").insert(charges);
        if (error) throw error;
      }
      if (payments.length > 0) {
        const { error } = await supabase.from("payments").insert(payments);
        if (error) throw error;
      }
      toast({
        title: "ثبت شد",
        description: `${charges.length} بدهی و ${payments.length} بستانکاری اولیه ذخیره شد`,
      });
      setUnitValues({});
      queryClient.invalidateQueries({ queryKey: ["unit-charges"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (e: any) {
      toast({ title: "خطا", description: e?.message || "خطا در ذخیره", variant: "destructive" });
    } finally {
      setUnitsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription className="text-sm">
          این بخش برای مهاجرت از سیستم قبلی است. مقادیر وارد شده به‌عنوان «موجودی اولیه» در سامانه ثبت می‌شوند و در گزارش‌های مالی لحاظ خواهند شد. توصیه می‌شود فقط یک‌بار در ابتدای راه‌اندازی استفاده شود.
        </AlertDescription>
      </Alert>

      {/* Fund opening balances */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            موجودی اولیه صندوق‌ها
          </CardTitle>
          <CardDescription>
            مانده نقدی موجود در هر صندوق در ابتدای مهاجرت به این سیستم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>موجودی صندوق شارژ (تومان)</Label>
              <NumericInput value={fundCharge} onChange={setFundCharge} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>موجودی صندوق شارژ فوق‌العاده (تومان)</Label>
              <NumericInput value={fundExtra} onChange={setFundExtra} placeholder="0" />
            </div>
          </div>
          <Button onClick={handleSaveFunds} disabled={fundSaving}>
            {fundSaving ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Save className="w-4 h-4 ml-2" />
            )}
            ذخیره موجودی صندوق‌ها
          </Button>
        </CardContent>
      </Card>

      {/* Unit opening balances */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            بدهی و بستانکاری اولیه واحدها
          </CardTitle>
          <CardDescription>
            برای هر واحد، در صورت نیاز مبلغ بدهی یا بستانکاری اولیه را وارد کنید. خالی گذاشتن یعنی صفر.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ابتدا واحدها را ثبت کنید</p>
          ) : (
            <>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((u) => {
                      const v = unitValues[u.id] || { cd: "", cc: "", ed: "", ec: "" };
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
                            />
                          </TableCell>
                          <TableCell>
                            <NumericInput
                              value={v.cc}
                              onChange={(val) => updateUnitField(u.id, "cc", val)}
                              placeholder="0"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <NumericInput
                              value={v.ed}
                              onChange={(val) => updateUnitField(u.id, "ed", val)}
                              placeholder="0"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <NumericInput
                              value={v.ec}
                              onChange={(val) => updateUnitField(u.id, "ec", val)}
                              placeholder="0"
                              className="w-32"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4">
                <Button onClick={handleSaveUnits} disabled={unitsSaving}>
                  {unitsSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  ذخیره موجودی اولیه واحدها
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
