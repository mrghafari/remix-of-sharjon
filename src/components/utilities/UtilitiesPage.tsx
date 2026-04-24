import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumericInput } from "@/components/ui/numeric-input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUtilityReadings, useCreateUtilityReading, useDeleteUtilityReading } from "@/hooks/useUtilityReadings";
import { useExpenses } from "@/hooks/useExpenses";
import { useBuilding } from "@/contexts/BuildingContext";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { Plus, Trash2, Droplets, Zap, Flame, TrendingUp, Loader2, Gauge } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const utilityTypes = [
  { id: "water", label: "آب", icon: "💧", unit: "متر مکعب", color: "hsl(200, 80%, 50%)", lucideIcon: Droplets },
  { id: "electricity", label: "برق", icon: "💡", unit: "کیلووات ساعت", color: "hsl(45, 90%, 50%)", lucideIcon: Zap },
  { id: "gas", label: "گاز", icon: "🔥", unit: "متر مکعب", color: "hsl(15, 80%, 50%)", lucideIcon: Flame },
];

const formatAmount = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const formatDate = (d: string) => formatJalaliDate(d);

export function UtilitiesPage() {
  const { currentBuildingId } = useBuilding();
  const { data: readings = [], isLoading } = useUtilityReadings();
  const { data: expenses = [] } = useExpenses();
  const createReading = useCreateUtilityReading();
  const deleteReading = useDeleteUtilityReading();

  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState("water");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formMeterValue, setFormMeterValue] = useState(""); // current meter reading (cumulative)
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // Get last meter value for selected type to compute consumption
  const lastMeterByType = useMemo(() => {
    const map: Record<string, number> = {};
    utilityTypes.forEach(ut => {
      const items = readings
        .filter(r => r.utility_type === ut.id)
        .sort((a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime());
      // Description format: "متر کنتور: <value>"
      for (const r of items) {
        const match = r.description?.match(/متر کنتور:\s*([\d.]+)/);
        if (match) {
          map[ut.id] = Number(match[1]);
          break;
        }
      }
    });
    return map;
  }, [readings]);

  const previousMeter = lastMeterByType[formType] ?? 0;
  const computedConsumption = formMeterValue
    ? Math.max(0, Number(formMeterValue) - previousMeter)
    : 0;

  const handleSubmit = () => {
    if (!currentBuildingId || !formMeterValue) return;
    const meterVal = Number(formMeterValue);
    const consumption = Math.max(0, meterVal - previousMeter);
    const meterNote = `متر کنتور: ${meterVal}`;
    const desc = formDesc ? `${meterNote} — ${formDesc}` : meterNote;
    createReading.mutate({
      building_id: currentBuildingId,
      utility_type: formType,
      reading_date: formDate,
      quantity: consumption,
      amount: Number(formAmount || "0"),
      description: desc,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setFormMeterValue("");
        setFormAmount("");
        setFormDesc("");
      },
    });
  };

  // Filtered readings
  const filtered = useMemo(() =>
    filterType === "all" ? readings : readings.filter(r => r.utility_type === filterType),
    [readings, filterType]
  );

  // Pull expense amounts for utility categories
  const expenseByUtility = useMemo(() => {
    const map: Record<string, number> = { water: 0, electricity: 0, gas: 0 };
    expenses.forEach(e => {
      if (e.category === "water") map.water += Number(e.amount);
      if (e.category === "electricity") map.electricity += Number(e.amount);
      if (e.category === "gas") map.gas += Number(e.amount);
    });
    return map;
  }, [expenses]);

  // Stats per utility type
  const stats = useMemo(() => {
    return utilityTypes.map(ut => {
      const items = readings.filter(r => r.utility_type === ut.id);
      const totalQty = items.reduce((s, r) => s + Number(r.quantity), 0);
      const totalAmt = items.reduce((s, r) => s + Number(r.amount), 0);
      const avgPrice = totalQty > 0 ? totalAmt / totalQty : 0;
      const expenseTotal = expenseByUtility[ut.id] || 0;
      return { ...ut, totalQty, totalAmt, avgPrice, count: items.length, expenseTotal };
    });
  }, [readings, expenseByUtility]);

  // Per-utility chart data (sorted by date asc, by month)
  const chartDataByType = useMemo(() => {
    const result: Record<string, { month: string; quantity: number; amount: number }[]> = {};
    utilityTypes.forEach(ut => {
      const monthMap: Record<string, { quantity: number; amount: number }> = {};
      readings
        .filter(r => r.utility_type === ut.id)
        .forEach(r => {
          const jalali = formatJalaliDate(r.reading_date);
          const key = jalali.substring(0, 7);
          if (!monthMap[key]) monthMap[key] = { quantity: 0, amount: 0 };
          monthMap[key].quantity += Number(r.quantity);
          monthMap[key].amount += Number(r.amount);
        });
      result[ut.id] = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, ...v }));
    });
    return result;
  }, [readings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Gauge className="w-7 h-7 text-primary" />
            مصارف انرژی
          </h1>
          <p className="text-muted-foreground mt-1">ثبت و پیگیری مصرف آب، برق و گاز ساختمان</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            ثبت قرائت کنتور
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
        {stats.map(st => {
          const Icon = st.lucideIcon;
          return (
            <Card key={st.id} variant="stats">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <span>{st.icon}</span> {st.label}
                    </p>
                    <p className="text-xl font-bold">{formatAmount(st.totalQty)} <span className="text-xs font-normal text-muted-foreground">{st.unit}</span></p>
                    <p className="text-sm text-muted-foreground">مبلغ قبوض: {formatAmount(st.totalAmt)} تومان</p>
                    {st.expenseTotal > 0 && (
                      <p className="text-xs text-muted-foreground">هزینه ثبت‌شده: {formatAmount(st.expenseTotal)} تومان</p>
                    )}
                  </div>
                  <div className="text-left space-y-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    {st.avgPrice > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        میانگین<br />
                        <span className="font-semibold text-foreground">{formatAmount(Math.round(st.avgPrice))}</span>
                        <br />ت/{st.unit === "کیلووات ساعت" ? "kWh" : "m³"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>ثبت قرائت کنتور</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">نوع کنتور</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {utilityTypes.map(ut => (
                      <SelectItem key={ut.id} value={ut.id}>{ut.icon} {ut.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">تاریخ قرائت</label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  رقم فعلی کنتور
                  {previousMeter > 0 && (
                    <span className="text-xs text-muted-foreground mr-2">
                      (قبلی: {formatAmount(previousMeter)})
                    </span>
                  )}
                </label>
                <NumericInput value={formMeterValue} onChange={setFormMeterValue} placeholder="عدد روی کنتور" />
                {formMeterValue && (
                  <p className="text-xs text-muted-foreground mt-1">
                    مصرف محاسبه‌شده: <span className="font-semibold text-foreground">{formatAmount(computedConsumption)}</span> {utilityTypes.find(u => u.id === formType)?.unit}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">مبلغ قبض (تومان)</label>
                <NumericInput value={formAmount} onChange={setFormAmount} placeholder="مبلغ" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1 block">توضیحات</label>
                <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="توضیحات اختیاری" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSubmit} disabled={createReading.isPending || !formMeterValue}>
                {createReading.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                ثبت
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>انصراف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-utility Trend Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {utilityTypes.map(ut => {
          const data = chartDataByType[ut.id] || [];
          const Icon = ut.lucideIcon;
          return (
            <Card key={ut.id} className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="w-5 h-5" style={{ color: ut.color }} />
                  روند مصرف {ut.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                    داده‌ای برای نمایش وجود ندارد
                  </div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          formatter={(value: number, name: string) => {
                            if (name === "quantity") return [formatAmount(value) + ` ${ut.unit}`, "مصرف"];
                            if (name === "amount") return [formatAmount(value) + " تومان", "مبلغ"];
                            return [formatAmount(value), name];
                          }}
                        />
                        <Line type="monotone" dataKey="quantity" stroke={ut.color} strokeWidth={2} dot={{ r: 3 }} name="quantity" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Readings Table */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>سوابق قرائت</CardTitle>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                {utilityTypes.map(ut => (
                  <SelectItem key={ut.id} value={ut.id}>{ut.icon} {ut.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">هنوز قرائتی ثبت نشده است</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نوع</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>مصرف</TableHead>
                  <TableHead>مبلغ (تومان)</TableHead>
                  <TableHead>قیمت واحد</TableHead>
                  <TableHead>توضیحات</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const ut = utilityTypes.find(u => u.id === r.utility_type);
                  const unitPrice = Number(r.quantity) > 0 ? Math.round(Number(r.amount) / Number(r.quantity)) : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{ut?.icon} {ut?.label}</TableCell>
                      <TableCell>{formatDate(r.reading_date)}</TableCell>
                      <TableCell>{formatAmount(Number(r.quantity))} <span className="text-xs text-muted-foreground">{ut?.unit}</span></TableCell>
                      <TableCell>{formatAmount(Number(r.amount))}</TableCell>
                      <TableCell className="text-xs">{unitPrice > 0 ? `${formatAmount(unitPrice)} ت` : "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.description || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف قرائت</AlertDialogTitle>
            <AlertDialogDescription>آیا از حذف این قرائت اطمینان دارید؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteReading.mutate(deleteId); setDeleteId(null); } }}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
