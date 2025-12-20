import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { ExpenseForm, ExpenseData } from "./ExpenseForm";
import { ExpensesList } from "./ExpensesList";
import { ExpenseStats } from "./ExpenseStats";
import { toast } from "@/hooks/use-toast";

// Initial mock data
const initialExpenses: ExpenseData[] = [
  {
    id: "1",
    title: "شارژ ماهانه آذر",
    amount: 60000000,
    category: "charge",
    date: "2024-12-01",
    description: "شارژ ماهانه تمام واحدها",
    paidBy: "ساکنین",
  },
  {
    id: "2",
    title: "تعمیر آسانسور",
    amount: 15000000,
    category: "elevator",
    date: "2024-12-05",
    description: "تعویض سیم بکسل آسانسور",
    paidBy: "صندوق ساختمان",
  },
  {
    id: "3",
    title: "نظافت راهرو و پارکینگ",
    amount: 5000000,
    category: "cleaning",
    date: "2024-12-10",
    description: "نظافت هفتگی",
    paidBy: "مدیریت",
  },
  {
    id: "4",
    title: "برق مشاعات",
    amount: 3500000,
    category: "electricity",
    date: "2024-12-12",
    description: "قبض برق مشترک",
    paidBy: "مدیریت",
  },
  {
    id: "5",
    title: "تعمیر لوله آب",
    amount: 8000000,
    category: "repair",
    date: "2024-11-20",
    description: "تعمیر لوله اصلی آب",
    paidBy: "صندوق ساختمان",
  },
];

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseData[]>(initialExpenses);
  const [showForm, setShowForm] = useState(false);

  const handleAddExpense = (expense: ExpenseData) => {
    setExpenses((prev) => [expense, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    toast({
      title: "حذف شد",
      description: "هزینه با موفقیت حذف شد",
    });
  };

  const handleEditExpense = (expense: ExpenseData) => {
    // For now, just show a toast - could open edit modal
    toast({
      title: "ویرایش",
      description: `ویرایش هزینه: ${expense.title}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Receipt className="w-7 h-7 text-primary" />
            مدیریت هزینه‌ها
          </h1>
          <p className="text-muted-foreground mt-1">
            ثبت و مشاهده هزینه‌های ساختمان
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            ثبت هزینه جدید
          </Button>
        )}
      </div>

      {/* Stats */}
      <ExpenseStats expenses={expenses} />

      {/* Add Expense Form */}
      {showForm && (
        <ExpenseForm 
          onClose={() => setShowForm(false)} 
          onSubmit={handleAddExpense} 
        />
      )}

      {/* Expenses List */}
      <ExpensesList 
        expenses={expenses} 
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />
    </div>
  );
}
