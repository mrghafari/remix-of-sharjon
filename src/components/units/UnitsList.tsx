import { useState, useMemo } from "react";
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
  ArrowUpDown,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
interface UnitsListProps {
  onEdit: (unit: Unit) => void;
}

const getFloorLabel = (floor: number | null) => {
  if (floor === null) return "-";
  if (floor === 0) return "همکف";
  return `طبقه ${floor}`;
};

type SortKey = "unit_number_asc" | "unit_number_desc" | "floor_asc" | "floor_desc" | "area_asc" | "area_desc" | "owner_asc";

export function UnitsList({ onEdit }: UnitsListProps) {
  const { data: units = [], isLoading } = useUnits();
  const deleteUnit = useDeleteUnit();
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("unit_number_asc");

  const sortedUnits = useMemo(() => {
    const arr = [...units];
    const numOr = (v: any, d: number) => {
      const n = parseFloat(String(v ?? ""));
      return isNaN(n) ? d : n;
    };
    switch (sortKey) {
      case "unit_number_asc":
        return arr.sort((a, b) => numOr(a.unit_number, Infinity) - numOr(b.unit_number, Infinity));
      case "unit_number_desc":
        return arr.sort((a, b) => numOr(b.unit_number, -Infinity) - numOr(a.unit_number, -Infinity));
      case "floor_asc":
        return arr.sort((a, b) => (a.floor ?? Infinity) - (b.floor ?? Infinity));
      case "floor_desc":
        return arr.sort((a, b) => (b.floor ?? -Infinity) - (a.floor ?? -Infinity));
      case "area_asc":
        return arr.sort((a, b) => numOr(a.area, Infinity) - numOr(b.area, Infinity));
      case "area_desc":
        return arr.sort((a, b) => numOr(b.area, -Infinity) - numOr(a.area, -Infinity));
      case "owner_asc":
        return arr.sort((a, b) => (a.owner_name || "").localeCompare(b.owner_name || "", "fa"));
      default:
        return arr;
    }
  }, [units, sortKey]);

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
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            لیست واحدها ({units.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="مرتب‌سازی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit_number_asc">پلاک (صعودی)</SelectItem>
                <SelectItem value="unit_number_desc">پلاک (نزولی)</SelectItem>
                <SelectItem value="floor_asc">طبقه (صعودی)</SelectItem>
                <SelectItem value="floor_desc">طبقه (نزولی)</SelectItem>
                <SelectItem value="area_asc">متراژ (صعودی)</SelectItem>
                <SelectItem value="area_desc">متراژ (نزولی)</SelectItem>
                <SelectItem value="owner_asc">نام مالک</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                  {sortedUnits.map((unit) => (
                    <TableRow key={unit.id} className="hover:bg-muted/50 transition-colors">
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
                        <div className="flex items-center gap-1">
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

    </>
  );
}
