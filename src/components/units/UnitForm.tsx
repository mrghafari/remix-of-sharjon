import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Loader2, Edit } from "lucide-react";
import { useCreateUnit, useUpdateUnit, type Unit, type CreateUnitData } from "@/hooks/useUnits";
import { NumericInput } from "@/components/ui/numeric-input";

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

  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();

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
      resident_name: residentName.trim() || null,
      resident_phone: residentPhone.trim() || null,
      landline_phone: landlinePhone.trim() || null,
      is_occupied: isOccupied,
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
                <Label htmlFor="unitNumber">شماره پلاک *</Label>
                <Input
                  id="unitNumber"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  maxLength={20}
                />
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
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">اطلاعات ساکن</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="residentName">نام ساکن</Label>
                <Input
                  id="residentName"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="residentPhone">شماره موبایل ساکن</Label>
                <Input
                  id="residentPhone"
                  type="tel"
                  value={residentPhone}
                  onChange={(e) => setResidentPhone(e.target.value)}
                  maxLength={15}
                  dir="ltr"
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
