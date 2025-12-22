import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUnits } from "@/hooks/useUnits";

const getFloorLabel = (floor: number | null) => {
  if (floor === null) return "-";
  if (floor === 0) return "همکف";
  return `طبقه ${floor}`;
};

export function UnitsTable() {
  const { data: units = [], isLoading } = useUnits();

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
    <Card variant="elevated" className="animate-fade-in opacity-0" style={{ animationDelay: "400ms" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>واحدهای ساختمان</CardTitle>
        <Button variant="outline" size="sm">
          مشاهده همه
        </Button>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">هیچ واحدی ثبت نشده است</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">شماره واحد</TableHead>
                <TableHead className="text-right">طبقه</TableHead>
                <TableHead className="text-right">مالک</TableHead>
                <TableHead className="text-right">تلفن</TableHead>
                <TableHead className="text-right">متراژ</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{unit.unit_number}</TableCell>
                  <TableCell>{getFloorLabel(unit.floor)}</TableCell>
                  <TableCell>{unit.owner_name}</TableCell>
                  <TableCell>
                    {unit.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {unit.phone}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{unit.area ? `${unit.area} متر` : "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={unit.is_occupied ? "default" : "secondary"}
                      className={unit.is_occupied ? "bg-success hover:bg-success/90" : ""}
                    >
                      {unit.is_occupied ? "سکونت" : "خالی"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
