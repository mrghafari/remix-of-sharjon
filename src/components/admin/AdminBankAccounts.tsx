import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Landmark, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface BankAccountWithBuilding {
  id: string;
  building_id: string;
  iban: string;
  account_holder: string;
  bank_name: string | null;
  is_approved: boolean;
  is_rejected: boolean;
  is_active: boolean;
  admin_notes: string | null;
  created_at: string;
  buildings: { name: string } | null;
}

const formatIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();

export function AdminBankAccounts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [search, setSearch] = useState("");
  const [actionTarget, setActionTarget] = useState<BankAccountWithBuilding | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["admin-bank-accounts"],
    queryFn: async () => {
      const { data: accs, error } = await supabase
        .from("building_bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const buildingIds = Array.from(new Set((accs || []).map((a) => a.building_id)));
      const { data: bldgs } = buildingIds.length
        ? await supabase.from("buildings").select("id, name").in("id", buildingIds)
        : { data: [] as { id: string; name: string }[] };
      const map = new Map((bldgs || []).map((b) => [b.id, b.name]));
      return (accs || []).map((a) => ({
        ...a,
        buildings: { name: map.get(a.building_id) || "—" },
      })) as BankAccountWithBuilding[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      is_approved: boolean;
      is_rejected: boolean;
      admin_notes: string | null;
    }) => {
      const { error } = await supabase
        .from("building_bank_accounts")
        .update({
          is_approved: vars.is_approved,
          is_rejected: vars.is_rejected,
          approved_at: vars.is_approved ? new Date().toISOString() : null,
          approved_by: vars.is_approved ? user?.id : null,
          admin_notes: vars.admin_notes,
          ...(vars.is_approved ? {} : { is_active: false }),
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "موفق", description: "وضعیت حساب به‌روزرسانی شد" });
      setActionTarget(null);
      setAdminNotes("");
    },
    onError: (e: any) => {
      toast({ title: "خطا", description: e?.message || "خطا", variant: "destructive" });
    },
  });

  const filtered = accounts
    ?.filter((a) => {
      if (filter === "pending") return !a.is_approved && !a.is_rejected;
      if (filter === "approved") return a.is_approved;
      return true;
    })
    .filter((a) => {
      if (search.length < 2) return true;
      const q = search.toLowerCase();
      return (
        a.iban.toLowerCase().includes(q) ||
        a.account_holder.toLowerCase().includes(q) ||
        a.buildings?.name.toLowerCase().includes(q) ||
        a.bank_name?.toLowerCase().includes(q)
      );
    });

  const openAction = (acc: BankAccountWithBuilding, type: "approve" | "reject") => {
    setActionTarget(acc);
    setActionType(type);
    setAdminNotes(acc.admin_notes || "");
  };

  const confirmAction = () => {
    if (!actionTarget) return;
    if (actionType === "reject" && !adminNotes.trim()) {
      toast({ title: "یادداشت الزامی است", description: "لطفاً دلیل رد حساب را برای مدیر بنویسید", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: actionTarget.id,
      is_approved: actionType === "approve",
      is_rejected: actionType === "reject",
      admin_notes: adminNotes.trim() || null,
    });
  };

  const pendingCount = accounts?.filter((a) => !a.is_approved && !a.is_rejected).length || 0;


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            حساب‌های بانکی ساختمان‌ها
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white mr-2">
                {pendingCount.toLocaleString("fa-IR")} در انتظار تایید
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              size="sm"
              variant={filter === "pending" ? "default" : "outline"}
              onClick={() => setFilter("pending")}
            >
              <Clock className="w-4 h-4 ml-1" />
              منتظر تایید
            </Button>
            <Button
              size="sm"
              variant={filter === "approved" ? "default" : "outline"}
              onClick={() => setFilter("approved")}
            >
              <CheckCircle2 className="w-4 h-4 ml-1" />
              تایید شده
            </Button>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              همه
            </Button>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو در شبا، نام ساختمان یا صاحب حساب..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filtered?.length ? (
            <p className="text-center text-muted-foreground py-10">موردی یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((acc) => (
                <div key={acc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-base">
                          {acc.buildings?.name || "—"}
                        </Badge>
                        {acc.is_rejected ? (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 ml-1" />
                            رد شده
                          </Badge>
                        ) : acc.is_approved ? (
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
                            پذیرنده فعال
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">شماره شبا</p>
                          <p className="font-mono" dir="ltr">{formatIban(acc.iban)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">صاحب حساب</p>
                          <p className="font-medium">{acc.account_holder}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">بانک</p>
                          <p className="font-medium">{acc.bank_name || "—"}</p>
                        </div>
                      </div>

                      {acc.admin_notes && (
                        <div className="text-xs bg-muted/50 p-2 rounded">
                          <b>یادداشت ادمین:</b> {acc.admin_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!acc.is_approved && !acc.is_rejected ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openAction(acc, "approve")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-1" />
                            تایید
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openAction(acc, "reject")}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            رد
                          </Button>
                        </>
                      ) : acc.is_approved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAction(acc, "reject")}
                        >
                          لغو تایید
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "تایید حساب بانکی" : "رد حساب بانکی"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "با تایید این حساب، مدیر می‌تواند آن را به عنوان پذیرنده واریزی‌ها فعال کند."
                : "حساب رد می‌شود و یادداشت شما به مدیر نمایش داده خواهد شد. لطفاً دلیل رد را به‌طور واضح بنویسید."}
            </DialogDescription>
          </DialogHeader>

          {actionTarget && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">ساختمان</p>
                <p className="font-medium">{actionTarget.buildings?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">شماره شبا</p>
                <p className="font-mono" dir="ltr">{formatIban(actionTarget.iban)}</p>
              </div>
              <div className="space-y-2">
                <Label>
                  {actionType === "reject" ? "دلیل رد (الزامی) *" : "یادداشت برای مدیر (اختیاری)"}
                </Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    actionType === "reject"
                      ? "مثلاً: شماره شبا با نام صاحب حساب در بانک مطابقت ندارد..."
                      : "مثلاً: پس از مذاکره با بانک تایید شد..."
                  }
                  rows={4}
                  maxLength={500}
                  required={actionType === "reject"}
                />
                <p className="text-xs text-muted-foreground">{adminNotes.length.toLocaleString("fa-IR")}/۵۰۰</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>
              انصراف
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateMutation.isPending}
              className={
                actionType === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : ""
              }
            >
              {actionType === "approve" ? "تایید نهایی" : "ثبت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
