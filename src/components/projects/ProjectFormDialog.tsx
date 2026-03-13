import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Slider } from "@/components/ui/slider";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useCreateProject, useUpdateProject, Project } from "@/hooks/useProjects";
import { NumericInput } from "@/components/ui/numeric-input";

const formSchema = z.object({
  name: z.string().min(1, "نام پروژه را وارد کنید"),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.string().optional(),
  is_active: z.boolean(),
  manager_charge_discount_percent: z.number().min(0).max(100),
  manager_extra_charge_discount_percent: z.number().min(0).max(100),
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
      manager_charge_discount_percent: 0,
      manager_extra_charge_discount_percent: 0,
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
        manager_charge_discount_percent: project.manager_charge_discount_percent ?? 0,
        manager_extra_charge_discount_percent: project.manager_extra_charge_discount_percent ?? 0,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        budget: "",
        is_active: true,
        manager_charge_discount_percent: 0,
        manager_extra_charge_discount_percent: 0,
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
      manager_charge_discount_percent: values.manager_charge_discount_percent,
      manager_extra_charge_discount_percent: values.manager_extra_charge_discount_percent,
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
                  <FormLabel>بودجه (تومان)</FormLabel>
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
                      <Input {...field} type="date" />
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
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <p className="text-sm font-semibold">درصد معافیت مدیر ساختمان در این پروژه</p>
              <p className="text-xs text-muted-foreground">پیش‌فرض: بدون معافیت (۰٪). مبلغ معافیت بین سایر واحدها تسهیم می‌شود.</p>
              
              <FormField
                control={form.control}
                name="manager_charge_discount_percent"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between text-sm">
                      <FormLabel>معافیت شارژ: {field.value}%</FormLabel>
                    </div>
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manager_extra_charge_discount_percent"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between text-sm">
                      <FormLabel>معافیت فوق‌شارژ: {field.value}%</FormLabel>
                    </div>
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
