import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Plus, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCreateExpense, type CreateExpenseData } from "@/hooks/useExpenses";
import type { Database } from "@/integrations/supabase/types";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

interface ExpenseFormProps {
  onClose: () => void;
}

export const categories: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: "charge", label: "شارژ ماهانه", icon: "💰" },
  { id: "repair", label: "تعمیرات", icon: "🔧" },
  { id: "cleaning", label: "نظافت", icon: "🧹" },
  { id: "elevator", label: "آسانسور", icon: "🛗" },
  { id: "electricity", label: "برق مشاع", icon: "💡" },
  { id: "water", label: "آب مشاع", icon: "💧" },
  { id: "gas", label: "گاز مشاع", icon: "🔥" },
  { id: "security", label: "نگهبانی", icon: "🛡️" },
  { id: "parking", label: "پارکینگ", icon: "🚗" },
  { id: "other", label: "سایر", icon: "📋" },
];

export function ExpenseForm({ onClose }: ExpenseFormProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  
  const createExpense = useCreateExpense();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !amount || !category) {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدهای ضروری را پر کنید",
        variant: "destructive",
      });
      return;
    }

    const expense: CreateExpenseData = {
      title: title.trim(),
      amount: parseFloat(amount),
      category: category as ExpenseCategory,
      expense_date: date,
      description: description.trim() || undefined,
    };

    createExpense.mutate(expense, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Card variant="elevated" className="animate-scale-in">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          ثبت هزینه جدید
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان هزینه *</Label>
              <Input
                id="title"
                placeholder="مثال: تعمیر آسانسور"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">مبلغ (تومان) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="مثال: 5000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">دسته‌بندی *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">تاریخ</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">توضیحات</Label>
            <Textarea
              id="description"
              placeholder="توضیحات اضافی..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={createExpense.isPending}>
              {createExpense.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  در حال ثبت...
                </>
              ) : (
                "ثبت هزینه"
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
