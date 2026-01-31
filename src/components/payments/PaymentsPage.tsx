import { PaymentForm } from "./PaymentForm";
import { PaymentsList } from "./PaymentsList";
import { PaymentsStats } from "./PaymentsStats";
import { CreditCard } from "lucide-react";

export function PaymentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">پرداخت‌ها</h1>
            <p className="text-sm text-muted-foreground">
              مدیریت و پیگیری پرداخت شارژ واحدها
            </p>
          </div>
        </div>
        <PaymentForm />
      </div>

      {/* Stats */}
      <PaymentsStats />

      {/* Payments List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">لیست پرداخت‌ها</h2>
        <PaymentsList />
      </div>
    </div>
  );
}
