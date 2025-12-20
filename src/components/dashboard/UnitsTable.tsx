import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit, Phone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const units = [
  {
    id: 1,
    number: "۱۰۱",
    floor: "طبقه اول",
    resident: "علی محمدی",
    phone: "۰۹۱۲۱۲۳۴۵۶۷",
    status: "پرداخت شده",
    area: "۱۲۰",
  },
  {
    id: 2,
    number: "۱۰۲",
    floor: "طبقه اول",
    resident: "زهرا احمدی",
    phone: "۰۹۱۲۷۶۵۴۳۲۱",
    status: "در انتظار",
    area: "۹۵",
  },
  {
    id: 3,
    number: "۲۰۱",
    floor: "طبقه دوم",
    resident: "محمد رضایی",
    phone: "۰۹۱۲۸۸۸۷۷۶۶",
    status: "پرداخت شده",
    area: "۱۵۰",
  },
  {
    id: 4,
    number: "۲۰۲",
    floor: "طبقه دوم",
    resident: "فاطمه کریمی",
    phone: "۰۹۱۲۵۵۵۴۴۳۳",
    status: "تاخیر",
    area: "۱۱۰",
  },
  {
    id: 5,
    number: "۳۰۱",
    floor: "طبقه سوم",
    resident: "حسین نوری",
    phone: "۰۹۱۲۳۳۳۲۲۱۱",
    status: "پرداخت شده",
    area: "۱۳۵",
  },
];

export function UnitsTable() {
  return (
    <Card variant="elevated" className="animate-fade-in opacity-0" style={{ animationDelay: "400ms" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>واحدهای ساختمان</CardTitle>
        <Button variant="outline" size="sm">
          مشاهده همه
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">شماره واحد</TableHead>
              <TableHead className="text-right">طبقه</TableHead>
              <TableHead className="text-right">ساکن</TableHead>
              <TableHead className="text-right">تلفن</TableHead>
              <TableHead className="text-right">متراژ</TableHead>
              <TableHead className="text-right">وضعیت</TableHead>
              <TableHead className="text-right">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium">{unit.number}</TableCell>
                <TableCell>{unit.floor}</TableCell>
                <TableCell>{unit.resident}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {unit.phone}
                  </div>
                </TableCell>
                <TableCell>{unit.area} متر</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      unit.status === "پرداخت شده"
                        ? "default"
                        : unit.status === "در انتظار"
                        ? "secondary"
                        : "destructive"
                    }
                    className={
                      unit.status === "پرداخت شده"
                        ? "bg-success hover:bg-success/90"
                        : ""
                    }
                  >
                    {unit.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
