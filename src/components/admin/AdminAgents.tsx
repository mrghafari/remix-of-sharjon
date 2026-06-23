import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Loader2, Check, X } from "lucide-react";

export function AdminAgents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [actionAgent, setActionAgent] = useState<any>(null);
  const [actionType, setActionType] = useState<"approved" | "rejected">("approved");
  const [notes, setNotes] = useState("");

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_admin_agents");
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: any) => {
      const { error } = await (supabase as any).rpc("admin_update_agent_status", {
        _agent_id: id,
        _status: status,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-agents"] });
      toast({ title: "وضعیت بروزرسانی شد" });
      setActionAgent(null);
      setNotes("");
    },
    onError: (e: any) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-green-600">تأیید شده</Badge>;
    if (s === "rejected") return <Badge variant="destructive">رد شده</Badge>;
    return <Badge variant="secondary">در انتظار</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" />مشاورین املاک</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : agents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">هنوز مشاوری ثبت‌نام نکرده است</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>موبایل</TableHead>
                <TableHead>آژانس</TableHead>
                <TableHead>شهر</TableHead>
                <TableHead>کد ملی</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.full_name}</TableCell>
                  <TableCell dir="ltr" className="text-left">{a.mobile}</TableCell>
                  <TableCell>{a.agency_name || "—"}</TableCell>
                  <TableCell>{a.city || "—"}</TableCell>
                  <TableCell dir="ltr">{a.national_code || "—"}</TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.status !== "approved" && (
                        <Button size="sm" variant="default" onClick={() => { setActionAgent(a); setActionType("approved"); setNotes(""); }}>
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {a.status !== "rejected" && (
                        <Button size="sm" variant="destructive" onClick={() => { setActionAgent(a); setActionType("rejected"); setNotes(""); }}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!actionAgent} onOpenChange={(o) => !o && setActionAgent(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{actionType === "approved" ? "تأیید مشاور" : "رد مشاور"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p>آیا مطمئن هستید که می‌خواهید <b>{actionAgent?.full_name}</b> را {actionType === "approved" ? "تأیید" : "رد"} کنید؟</p>
            <Textarea placeholder="یادداشت (اختیاری)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionAgent(null)}>انصراف</Button>
            <Button
              variant={actionType === "approved" ? "default" : "destructive"}
              onClick={() => updateStatus.mutate({ id: actionAgent.id, status: actionType, notes })}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأیید"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
