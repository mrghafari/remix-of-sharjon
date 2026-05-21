import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Loader2, Edit, Lock } from "lucide-react";
import { useCreateUnit, useUpdateUnit, type Unit, type CreateUnitData } from "@/hooks/useUnits";
import { NumericInput } from "@/components/ui/numeric-input";
import { UnitAssetsManager } from "./UnitAssetsManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UnitFormProps {
  onClose: () => void;
  editUnit?: Unit | null;
}

export function UnitForm({ onClose, editUnit }: UnitFormProps) {
  const [unitNumber, setUnitNumber] = useState(editUnit?.unit_number || "");
  const [area, setArea] = useState(editUnit?.area?.toString() || "");
  const [floor, setFloor] = useState(editUnit?.floor?.toString() || "");
  const [residentCount, setResidentCount] = useState(editUnit?.resident_count?.toString() || "1");
  const [ownerName, setOwnerName] = useState(editUnit?.owner_name || "");
  const [ownerPhone, setOwnerPhone] = useState(editUnit?.phone || "");
  const [residentName, setResidentName] = useState(editUnit?.resident_name || "");
  const [residentPhone, setResidentPhone] = useState(editUnit?.resident_phone || "");
  const [landlinePhone, setLandlinePhone] = useState(editUnit?.landline_phone || "");
  const [isOccupied, setIsOccupied] = useState(editUnit?.is_occupied ?? true);
  const [latePenaltyExempt, setLatePenaltyExempt] = useState(editUnit?.late_penalty_exempt ?? false);
  const [sameAsOwner, setSameAsOwner] = useState(
    !!editUnit &&
      !!editUnit.owner_name &&
      editUnit.owner_name === (editUnit.resident_name || "") &&
      (editUnit.phone || "") === (editUnit.resident_phone || "")
  );

  const handleSameAsOwnerChange = (checked: boolean) => {
    setSameAsOwner(checked);
    if (checked) {
      setResidentName(ownerName);
      setResidentPhone(ownerPhone);
    }
  };

  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();

  // Check if unit has any related records (payments or expenses)
  const { data: hasRecords = false } = useQuery({
    queryKey: ["unit-has-records", editUnit?.id],
    queryFn: async () => {
      if (!editUnit?.id) return false;
      const [payments, expenses] = await Promise.all([
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("unit_id", editUnit.id),
        supabase.from("expenses").select("id", { count: "exact", head: true }).eq("unit_id", editUnit.id),
      ]);
      return ((payments.count || 0) + (expenses.count || 0)) > 0;
    },
    enabled: !!editUnit?.id,
  });

  const isUnitNumberLocked = !!editUnit && hasRecords;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unitNumber.trim() || !ownerName.trim()) {
      return;
    }

    const unitData: CreateUnitData = {
      unit_number: unitNumber.trim(),
      owner_name: ownerName.trim(),
      phone: ownerPhone.trim() || null,
      area: area ? parseFloat(area) : null,
      floor: floor ? parseInt(floor) : null,
      resident_count: residentCount ? parseInt(residentCount) : 1,
      resident_name: sameAsOwner ? (ownerName.trim() || null) : (residentName.trim() || null),
      resident_phone: sameAsOwner ? (ownerPhone.trim() || null) : (residentPhone.trim() || null),
      landline_phone: landlinePhone.trim() || null,
      is_occupied: isOccupied,
      late_penalty_exempt: latePenaltyExempt,
    };

    if (editUnit) {
      updateUnit.mutate({ id: editUnit.id, ...unitData }, {
        onSuccess: () => onClose(),
      });
    } else {
      createUnit.mutate(unitData, {
        onSuccess: () => onClose(),
      });
    }
  };

  const isPending = createUnit.isPending || updateUnit.isPending;

  return (
    <Card variant="elevated" className="animate-scale-in">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          {editUnit ? (
            <>
              <Edit className="w-5 h-5 text-primary" />
              ویرایش واحد
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 text-primary" />
              ثبت واحد جدید
            </>
          )}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">اطلاعات پایه</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="unitNumber">شماره واحد *</Label>
                <div className="relative">
                  <Input
                    id="unitNumber"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    maxLength={20}
                    disabled={isUnitNumberLocked}
                    className={isUnitNumberLocked ? "bg-muted cursor-not-allowed pr-9" : ""}
                  />
                  {isUnitNumberLocked && (
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                {isUnitNumberLocked && (
                  <p className="text-xs text-muted-foreground">شماره واحد قابل تغییر نمی‌باشد</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">متراژ (متر)</Label>
                <NumericInput
                  id="area"
                  value={area}
                  onChange={setArea}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">طبقه</Label>
                <NumericInput
                  id="floor"
                  value={floor}
                  onChange={setFloor}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="residentCount">تعداد افراد ساکن</Label>
                <NumericInput
                  id="residentCount"
                  value={residentCount}
                  onChange={setResidentCount}
                />
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">اطلاعات مالک</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerName">نام مالک *</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerPhone">شماره تلفن مالک</Label>
                <Input
                  id="ownerPhone"
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  maxLength={15}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Resident Info */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">اطلاعات ساکن</h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sameAsOwner"
                  checked={sameAsOwner}
                  onCheckedChange={(c) => handleSameAsOwnerChange(!!c)}
                />
                <Label htmlFor="sameAsOwner" className="cursor-pointer text-sm">
                  مالک و ساکن یکی هستند
                </Label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="residentName">نام ساکن</Label>
                <Input
                  id="residentName"
                  value={sameAsOwner ? ownerName : residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  maxLength={100}
                  disabled={sameAsOwner}
                  className={sameAsOwner ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="residentPhone">شماره موبایل ساکن</Label>
                <Input
                  id="residentPhone"
                  type="tel"
                  value={sameAsOwner ? ownerPhone : residentPhone}
                  onChange={(e) => setResidentPhone(e.target.value)}
                  maxLength={15}
                  dir="ltr"
                  disabled={sameAsOwner}
                  className={sameAsOwner ? "bg-muted cursor-not-allowed" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landlinePhone">شماره تلفن ثابت</Label>
                <Input
                  id="landlinePhone"
                  type="tel"
                  value={landlinePhone}
                  onChange={(e) => setLandlinePhone(e.target.value)}
                  maxLength={15}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Switch
                id="isOccupied"
                checked={isOccupied}
                onCheckedChange={setIsOccupied}
              />
              <Label htmlFor="isOccupied" className="cursor-pointer">
                این واحد دارای ساکن است
              </Label>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Switch
                id="latePenaltyExempt"
                checked={latePenaltyExempt}
                onCheckedChange={setLatePenaltyExempt}
              />
              <Label htmlFor="latePenaltyExempt" className="cursor-pointer">
                این واحد از محاسبه جریمه تأخیر معاف است
              </Label>
            </div>
          </div>

          {/* Storages & Vehicles - only available after the unit exists */}
          {editUnit && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">انبارها و خودروها</h3>
              <UnitAssetsManager unitId={editUnit.id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  در حال ثبت...
                </>
              ) : editUnit ? (
                "ذخیره تغییرات"
              ) : (
                "ثبت واحد"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
