import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Loader2,
  Edit,
  Trash2,
  Users,
  Building2,
  Ruler,
  PhoneCall,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUnits, useDeleteUnit, type Unit } from "@/hooks/useUnits";
import { UnitFinanceDialog } from "./UnitFinanceDialog";
interface UnitsListProps {
  onEdit: (unit: Unit) => void;
}

const getFloorLabel = (floor: number | null) => {
  if (floor === null) return "-";
  if (floor === 0) return "همکف";
  return `طبقه ${floor}`;
};

export function UnitsList({ onEdit }: UnitsListProps) {
  const { data: units = [], isLoading } = useUnits();
  const deleteUnit = useDeleteUnit();
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const handleDelete = () => {
    if (unitToDelete) {
      deleteUnit.mutate(unitToDelete.id);
      setUnitToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card variant="elevated" className="animate-fade-in">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="elevated" className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            لیست واحدها ({units.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">هیچ واحدی ثبت نشده است</p>
              <p className="text-sm">برای شروع، یک واحد جدید اضافه کنید</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">پلاک</TableHead>
                    <TableHead className="text-right">طبقه</TableHead>
                    <TableHead className="text-right">متراژ</TableHead>
                    <TableHead className="text-right">تعداد افراد</TableHead>
                    <TableHead className="text-right">مالک</TableHead>
                    <TableHead className="text-right">تلفن مالک</TableHead>
                    <TableHead className="text-right">ساکن</TableHead>
                    <TableHead className="text-right">تلفن ساکن</TableHead>
                    <TableHead className="text-right">تلفن ثابت</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedUnit(unit)}>
                      <TableCell className="font-bold text-primary">
                        {unit.unit_number}
                      </TableCell>
                      <TableCell>{getFloorLabel(unit.floor)}</TableCell>
                      <TableCell>
                        {unit.area ? (
                          <span className="flex items-center gap-1">
                            <Ruler className="w-3 h-3 text-muted-foreground" />
                            {unit.area} متر
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {unit.resident_count || 1} نفر
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{unit.owner_name}</TableCell>
                      <TableCell>
                        {unit.phone ? (
                          <div className="flex items-center gap-1 text-sm" dir="ltr">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {unit.phone}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{unit.resident_name || "-"}</TableCell>
                      <TableCell>
                        {unit.resident_phone ? (
                          <div className="flex items-center gap-1 text-sm" dir="ltr">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {unit.resident_phone}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.landline_phone ? (
                          <div className="flex items-center gap-1 text-sm" dir="ltr">
                            <PhoneCall className="w-3 h-3 text-muted-foreground" />
                            {unit.landline_phone}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={unit.is_occupied ? "default" : "secondary"}
                          className={unit.is_occupied ? "bg-success hover:bg-success/90" : ""}
                        >
                          {unit.is_occupied ? "سکونت" : "خالی"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(unit)}
                            className="h-8 w-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setUnitToDelete(unit)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!unitToDelete} onOpenChange={() => setUnitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف واحد</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف واحد {unitToDelete?.unit_number} اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unit Finance Dialog */}
      <UnitFinanceDialog
        unit={selectedUnit}
        open={!!selectedUnit}
        onOpenChange={(open) => !open && setSelectedUnit(null)}
      />
    </>
  );
}
