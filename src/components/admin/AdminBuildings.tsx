import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";
import { useAdminBuildings } from "@/hooks/useAdmin";

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("fa-IR"); } catch { return d; }
}

export function AdminBuildings() {
  const { data: buildings, isLoading } = useAdminBuildings();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          لیست ساختمان‌ها
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !buildings?.length ? (
          <p className="text-center text-muted-foreground py-10">هنوز ساختمانی ثبت نشده است</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام ساختمان</TableHead>
                  <TableHead>آدرس</TableHead>
                  <TableHead>تعداد واحدها</TableHead>
                  <TableHead>مدیر</TableHead>
                  <TableHead>ایمیل مدیر</TableHead>
                  <TableHead>تاریخ ایجاد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.address || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{b.total_units.toLocaleString("fa-IR")} واحد</Badge>
                    </TableCell>
                    <TableCell>{b.manager_name || "—"}</TableCell>
                    <TableCell className="text-xs ltr">{b.manager_email || "—"}</TableCell>
                    <TableCell>{formatDate(b.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
