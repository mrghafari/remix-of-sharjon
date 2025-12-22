import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { ExpenseForm } from "./ExpenseForm";
import { ExpensesList } from "./ExpensesList";
import { ExpenseStats } from "./ExpenseStats";

export function ExpensesPage() {
  const [showForm, setShowForm] = useState(false);

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
      <ExpenseStats />

      {/* Add Expense Form */}
      {showForm && (
        <ExpenseForm onClose={() => setShowForm(false)} />
      )}

      {/* Expenses List */}
      <ExpensesList />
    </div>
  );
}
