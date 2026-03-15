import { useState, useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Building2, CreditCard, Receipt, FileText, Settings, Home, FolderOpen } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useExpenses } from "@/hooks/useExpenses";
import { usePayments } from "@/hooks/usePayments";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.round(amount));

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "داشبورد", icon: Home },
  { id: "units", label: "واحدها", icon: Building2 },
  { id: "expenses", label: "هزینه‌ها", icon: Receipt },
  { id: "payments", label: "پرداخت‌ها", icon: CreditCard },
  { id: "reports", label: "گزارش‌ها", icon: FileText },
  { id: "documents", label: "اسناد ساختمان", icon: FolderOpen },
  { id: "settings", label: "تنظیمات", icon: Settings },
];

export function SearchCommand({ open, onOpenChange, onTabChange }: SearchCommandProps) {
  const { data: units = [] } = useUnits();
  const { data: expenses = [] } = useExpenses();
  const { data: payments = [] } = usePayments();

  // Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const navigate = (tab: string) => {
    onTabChange(tab);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="جستجو در بخش‌ها، واحدها، هزینه‌ها و پرداخت‌ها..." />
      <CommandList>
        <CommandEmpty>نتیجه‌ای یافت نشد.</CommandEmpty>

        <CommandGroup heading="بخش‌ها">
          {menuItems.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => navigate(item.id)}
              className="gap-3 cursor-pointer"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {units.length > 0 && (
          <CommandGroup heading="واحدها">
            {units.map((unit) => (
              <CommandItem
                key={unit.id}
                value={`واحد ${unit.unit_number} ${unit.owner_name} ${unit.phone || ""}`}
                onSelect={() => navigate("units")}
                className="gap-3 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>واحد {unit.unit_number} - {unit.owner_name}</span>
                {unit.area && (
                  <span className="text-xs text-muted-foreground mr-auto">{unit.area} متر</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {expenses.length > 0 && (
          <CommandGroup heading="هزینه‌ها">
            {expenses.slice(0, 10).map((expense) => (
              <CommandItem
                key={expense.id}
                value={`هزینه ${expense.title} ${expense.description || ""}`}
                onSelect={() => navigate("expenses")}
                className="gap-3 cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <span>{expense.title}</span>
                <span className="text-xs text-muted-foreground mr-auto">
                  {formatAmount(expense.amount)} تومان
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {payments.length > 0 && (
          <CommandGroup heading="پرداخت‌ها">
            {payments.slice(0, 10).map((payment: any) => (
              <CommandItem
                key={payment.id}
                value={`پرداخت ${payment.units?.unit_number || ""} ${payment.units?.owner_name || ""} ${payment.description || ""}`}
                onSelect={() => navigate("payments")}
                className="gap-3 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span>
                  واحد {payment.units?.unit_number || "?"} - {formatAmount(payment.amount)} تومان
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
