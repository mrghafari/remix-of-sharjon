import { useEffect } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useCreateProject, useUpdateProject, Project } from "@/hooks/useProjects";
import { NumericInput } from "@/components/ui/numeric-input";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { fromJalaliString, toJalaliString } from "@/lib/jalaliDate";

// Safely parse a stored date (ISO "yyyy-MM-dd" or Jalali "yyyy/MM/dd") into a Date
const parseStoredDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  try {
    if (value.includes("-")) {
      // ISO date from DB
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d;
    }
    // Jalali "yyyy/MM/dd"
    const iso = fromJalaliString(value);
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
};

// Convert a Date to ISO "yyyy-MM-dd" for DB storage
const toIsoDate = (d?: Date): string => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formSchema = z.object({
  name: z.string().min(1, "نام پروژه را وارد کنید"),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.string().optional(),
  is_active: z.boolean(),
  apply_manager_discount: z.boolean(),
  is_visible_to_residents: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      start_date: "",
      end_date: "",
      budget: "",
      is_active: true,
      apply_manager_discount: false,
      is_visible_to_residents: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        budget: project.budget ? project.budget.toString() : "",
        is_active: project.is_active,
        apply_manager_discount: project.apply_manager_discount ?? false,
        is_visible_to_residents: project.is_visible_to_residents ?? true,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        budget: "",
        is_active: true,
        apply_manager_discount: false,
        is_visible_to_residents: true,
      });
    }
  }, [project, form, open]);

  const onSubmit = (values: FormValues) => {
    const data = {
      name: values.name,
      description: values.description || undefined,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
      budget: values.budget ? parseFloat(values.budget) : undefined,
      is_active: values.is_active,
      apply_manager_discount: values.apply_manager_discount,
      is_visible_to_residents: values.is_visible_to_residents,
    };

    if (project) {
      updateProject.mutate({ id: project.id, ...data }, { onSuccess: () => onOpenChange(false) });
    } else {
      createProject.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "ویرایش پروژه" : "افزودن پروژه"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام پروژه *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>توضیحات</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>بودجه (ریال)</FormLabel>
                  <FormControl>
                    <NumericInput value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاریخ شروع</FormLabel>
                    <FormControl>
                      <JalaliDatePicker
                        value={parseStoredDate(field.value)}
                        onChange={(d) => field.onChange(toIsoDate(d))}
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
                    <FormLabel>تاریخ پایان</FormLabel>
                    <FormControl>
                      <JalaliDatePicker
                        value={parseStoredDate(field.value)}
                        onChange={(d) => field.onChange(toIsoDate(d))}
                        placeholder="انتخاب تاریخ"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="apply_manager_discount"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <FormLabel>اعمال تخفیف مدیر در این پروژه</FormLabel>
                    <FormDescription>
                      در صورت فعال بودن، تخفیف مدیر ساختمان روی هزینه‌های این پروژه نیز اعمال می‌شود
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_visible_to_residents"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <FormLabel>قابل نمایش به ساکنین</FormLabel>
                    <FormDescription>
                      در صورت فعال بودن، این پروژه و هزینه‌های آن در پنل ساکنین نیز نمایش داده می‌شود
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

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
              {project ? "به‌روزرسانی" : "ثبت پروژه"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
