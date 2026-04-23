import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Building2, UserCircle2 } from "lucide-react";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { useUnits } from "@/hooks/useUnits";
import { useCreateManager, useUpdateManager, Manager } from "@/hooks/useManagers";
import { useManagerRoles } from "@/hooks/useManagerRoles";
import { toJalaliString, fromJalaliString, getTodayJalali } from "@/lib/jalaliDate";
import { cn } from "@/lib/utils";

const internalSchema = z.object({
  source: z.literal("internal"),
  unit_id: z.string().min(1, "واحد را انتخاب کنید"),
  role_id: z.string().min(1, "نقش مدیریتی را انتخاب کنید"),
  role_type: z.enum(["owner", "resident"]),
  mobile: z.string().optional(),
  email: z.string().email("ایمیل نامعتبر است").optional().or(z.literal("")),
  external_name: z.string().optional(),
  start_date: z.string().min(1, "تاریخ شروع را وارد کنید"),
  end_date: z.string().optional(),
  charge_discount_percent: z.number().min(0).max(100),
  extra_charge_discount_percent: z.number().min(0).max(100),
  is_active: z.boolean(),
});

const externalSchema = z.object({
  source: z.literal("external"),
  unit_id: z.string().optional(),
  role_id: z.string().min(1, "نقش مدیریتی را انتخاب کنید"),
  role_type: z.literal("external"),
  external_name: z.string().min(1, "نام مدیر را وارد کنید"),
  mobile: z.string().optional(),
  email: z.string().email("ایمیل نامعتبر است").optional().or(z.literal("")),
  start_date: z.string().min(1, "تاریخ شروع را وارد کنید"),
  end_date: z.string().optional(),
  charge_discount_percent: z.number().min(0).max(100),
  extra_charge_discount_percent: z.number().min(0).max(100),
  is_active: z.boolean(),
});

const formSchema = z.discriminatedUnion("source", [internalSchema, externalSchema]);

type FormValues = z.infer<typeof formSchema>;

interface ManagerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: Manager | null;
}

export function ManagerFormDialog({ open, onOpenChange, manager }: ManagerFormDialogProps) {
  const { data: units = [] } = useUnits();
  const { data: roles = [] } = useManagerRoles();
  const createManager = useCreateManager();
  const updateManager = useUpdateManager();

  const isExternal = manager ? manager.role_type === "external" : false;
  const [source, setSource] = useState<"internal" | "external">(isExternal ? "external" : "internal");

  const defaultRoleId = roles.find((r) => r.name === "main")?.id || roles[0]?.id || "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: "internal",
      unit_id: "",
      role_id: defaultRoleId,
      role_type: "owner",
      mobile: "",
      email: "",
      external_name: "",
      start_date: getTodayJalali(),
      end_date: "",
      charge_discount_percent: 0,
      extra_charge_discount_percent: 0,
      is_active: true,
    } as FormValues,
  });

  useEffect(() => {
    if (!open) return;
    if (manager) {
      const src = manager.role_type === "external" ? "external" : "internal";
      setSource(src);
      form.reset({
        source: src,
        unit_id: manager.unit_id || "",
        role_id: manager.role_id || defaultRoleId,
        role_type: manager.role_type as any,
        mobile: manager.mobile || "",
        email: manager.email || "",
        external_name: manager.external_name || "",
        start_date: toJalaliString(new Date(manager.start_date)),
        end_date: manager.end_date ? toJalaliString(new Date(manager.end_date)) : "",
        charge_discount_percent: manager.charge_discount_percent,
        extra_charge_discount_percent: manager.extra_charge_discount_percent,
        is_active: manager.is_active,
      } as FormValues);
    } else {
      setSource("internal");
      form.reset({
        source: "internal",
        unit_id: "",
        role_id: defaultRoleId,
        role_type: "owner",
        mobile: "",
        email: "",
        external_name: "",
        start_date: getTodayJalali(),
        end_date: "",
        charge_discount_percent: 0,
        extra_charge_discount_percent: 0,
        is_active: true,
      } as FormValues);
    }
  }, [manager, form, open, defaultRoleId]);

  const handleSourceChange = (newSource: "internal" | "external") => {
    setSource(newSource);
    form.setValue("source", newSource);
    if (newSource === "external") {
      form.setValue("role_type", "external" as any);
      form.setValue("unit_id", "");
    } else {
      form.setValue("role_type", "owner" as any);
    }
  };

  const selectedUnit = units.find((u) => u.id === form.watch("unit_id"));
  const roleType = form.watch("role_type");

  const onSubmit = (values: FormValues) => {
    const data = {
      unit_id: values.source === "internal" ? values.unit_id : null,
      role_id: values.role_id,
      role_type: values.role_type,
      external_name: values.source === "external" ? values.external_name : undefined,
      mobile: values.mobile || undefined,
      email: values.email || undefined,
      start_date: fromJalaliString(values.start_date),
      end_date: values.end_date ? fromJalaliString(values.end_date) : undefined,
      charge_discount_percent: values.charge_discount_percent,
      extra_charge_discount_percent: values.extra_charge_discount_percent,
      is_active: values.is_active,
    };

    if (manager) {
      updateManager.mutate({ id: manager.id, ...data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createManager.mutate(data as any, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createManager.isPending || updateManager.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{manager ? "ویرایش مدیر" : "افزودن مدیر"}</DialogTitle>
        </DialogHeader>

        {/* Source selector */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            type="button"
            onClick={() => handleSourceChange("internal")}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
              source === "internal"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Building2 className="h-4 w-4" />
            از درون ساختمان
          </button>
          <button
            type="button"
            onClick={() => handleSourceChange("external")}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
              source === "external"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <UserCircle2 className="h-4 w-4" />
            از خارج ساختمان
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نقش مدیریتی</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="نقش را انتخاب کنید" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {source === "internal" ? (
              <>
                <FormField
                  control={form.control}
                  name="unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>واحد</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="واحد را انتخاب کنید" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              پلاک {unit.unit_number} - {unit.owner_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نقش</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="owner">مالک</SelectItem>
                          <SelectItem value="resident">ساکن</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedUnit && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="font-medium mb-1">اطلاعات از سیستم:</div>
                    <div className="text-muted-foreground">
                      {roleType === "owner" ? (
                        <>نام: {selectedUnit.owner_name}{selectedUnit.phone && ` | تلفن: ${selectedUnit.phone}`}</>
                      ) : (
                        <>نام: {selectedUnit.resident_name || selectedUnit.owner_name}{(selectedUnit.resident_phone || selectedUnit.phone) && ` | تلفن: ${selectedUnit.resident_phone || selectedUnit.phone}`}</>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <FormField
                control={form.control}
                name="external_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام و نام خانوادگی مدیر</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>موبایل</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ایمیل</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاریخ شروع</FormLabel>
                    <FormControl>
                      <JalaliDatePicker
                        value={field.value ? new Date(fromJalaliString(field.value)) : undefined}
                        onChange={(d) => field.onChange(d ? toJalaliString(d) : "")}
                        placeholder="انتخاب تاریخ"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاریخ پایان (اختیاری)</FormLabel>
                    <FormControl>
                      <JalaliDatePicker
                        value={field.value ? new Date(fromJalaliString(field.value)) : undefined}
                        onChange={(d) => field.onChange(d ? toJalaliString(d) : "")}
                        placeholder="انتخاب تاریخ"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {source === "internal" && (
              <>
                <FormField
                  control={form.control}
                  name="charge_discount_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تخفیف شارژ: {field.value}%</FormLabel>
                      <FormControl>
                        <Slider value={[field.value]} onValueChange={(val) => field.onChange(val[0])} min={0} max={100} step={5} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="extra_charge_discount_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تخفیف شارژ اضافی: {field.value}%</FormLabel>
                      <FormControl>
                        <Slider value={[field.value]} onValueChange={(val) => field.onChange(val[0])} min={0} max={100} step={5} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>فعال</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {manager ? "به‌روزرسانی" : "ثبت مدیر"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
