import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Landmark, Trash2, CheckCircle2, Clock, Plus, Info } from "lucide-react";
import { useBankAccounts, useCreateBankAccount, useDeleteBankAccount, useUpdateBankAccount } from "@/hooks/useBankAccounts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Convert Persian/Arabic digits to English
const toEnglishDigits = (str: string) =>
  str.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
     .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const formatIban = (iban: string) => {
  const cleaned = toEnglishDigits(iban).replace(/\s/g, "").toUpperCase();
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
};

export function BankAccountSettings() {
  const { data: accounts, isLoading } = useBankAccounts();
  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount();
  const deleteMutation = useDeleteBankAccount();

  const [showForm, setShowForm] = useState(false);
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedIban = toEnglishDigits(iban).replace(/\s/g, "").toUpperCase();
    const ibanDigits = cleanedIban.startsWith("IR") ? cleanedIban.slice(2) : cleanedIban;
    if (!/^\d{24}$/.test(ibanDigits)) {
      return;
    }
    await createMutation.mutateAsync({
      iban: "IR" + ibanDigits,
      account_holder: accountHolder.trim(),
      bank_name: bankName.trim() || undefined,
    });
    setIban("");
    setAccountHolder("");
    setBankName("");
    setShowForm(false);
  };

  const toggleActive = (id: string, current: boolean) => {
    updateMutation.mutate({ id, is_active: !current });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                حساب‌های بانکی ساختمان
              </CardTitle>
              <CardDescription className="mt-1">
                شماره شبای حساب بانکی ساختمان را برای دریافت واریزی‌ها معرفی کنید. حساب پس از تایید ادمین قابل استفاده خواهد بود.
              </CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-4 h-4 ml-1" />
                افزودن حساب
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>شماره شبا (IBAN) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono">IR</span>
                  <Input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="۲۴ رقم"
                    dir="ltr"
                    className="font-mono"
                    maxLength={32}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">۲۴ رقم بدون پیشوند IR وارد کنید</p>
              </div>

              <div className="space-y-2">
                <Label>نام صاحب حساب *</Label>
                <Input
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="مثلاً: ساختمان..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>نام بانک</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثلاً: ملت، ملی، صادرات"
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  پس از ثبت، حساب در وضعیت <b>«منتظر تایید»</b> قرار می‌گیرد تا ادمین با بانک مذاکره کند. پس از تایید ادمین می‌توانید آن را به عنوان حساب پذیرنده واریزی‌ها فعال کنید.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  ثبت حساب
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  انصراف
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">در حال بارگذاری...</p>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>هنوز حساب بانکی ثبت نشده است</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {acc.is_approved ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                            تایید شده
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <Clock className="w-3 h-3 ml-1" />
                            منتظر تایید
                          </Badge>
                        )}
                        {acc.is_active && (
                          <Badge className="bg-primary/10 text-primary">
                            پذیرنده فعال واریزی‌ها
                          </Badge>
                        )}
                        {acc.bank_name && (
                          <span className="text-sm text-muted-foreground">بانک {acc.bank_name}</span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">شماره شبا</p>
                        <p className="font-mono text-sm" dir="ltr">{formatIban(acc.iban)}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">صاحب حساب</p>
                        <p className="text-sm font-medium">{acc.account_holder}</p>
                      </div>

                      {acc.admin_notes && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <b>یادداشت ادمین:</b> {acc.admin_notes}
                          </AlertDescription>
                        </Alert>
                      )}

                      {!acc.is_approved && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          ⏳ در انتظار تایید ادمین — پس از مذاکره با بانک و تایید، می‌توانید این حساب را به عنوان پذیرنده واریزی‌ها فعال کنید.
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(acc.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {acc.is_approved && (
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div>
                        <Label className="text-sm">پذیرنده فعال واریزی‌ها</Label>
                        <p className="text-xs text-muted-foreground">
                          فقط یک حساب می‌تواند به‌عنوان پذیرنده فعال باشد
                        </p>
                      </div>
                      <Switch
                        checked={acc.is_active}
                        onCheckedChange={() => toggleActive(acc.id, acc.is_active)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف حساب بانکی؟</AlertDialogTitle>
            <AlertDialogDescription>
              این حساب بانکی به طور کامل حذف خواهد شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
