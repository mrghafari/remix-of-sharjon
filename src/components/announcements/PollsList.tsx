import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, BarChart3, X, Loader2, CheckCircle2 } from "lucide-react";
import { formatJalaliDate } from "@/lib/jalaliDate";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";

interface Poll {
  id: string;
  building_id: string;
  question: string;
  options: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  ends_at: string | null;
}

interface PollVote {
  id: string;
  poll_id: string;
  voter_hash: string;
  selected_option: number;
}

export function PollsList() {
  const { currentBuildingId } = useBuilding();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [endsAt, setEndsAt] = useState<Date | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["building-polls", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await (supabase as any)
        .from("building_polls")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Poll[]) || [];
    },
    enabled: !!currentBuildingId,
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ["building-poll-votes", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await (supabase as any)
        .from("building_poll_votes")
        .select("*")
        .eq("building_id", currentBuildingId);
      if (error) throw error;
      return (data as PollVote[]) || [];
    },
    enabled: !!currentBuildingId,
  });

  const { data: myHashes = [] } = useQuery({
    queryKey: ["my-voter-hashes", currentBuildingId, polls.map((p) => p.id).join(",")],
    queryFn: async () => {
      const results: { pollId: string; hash: string }[] = [];
      for (const poll of polls) {
        const { data } = await supabase.rpc("get_voter_hash", { _poll_id: poll.id });
        if (data) results.push({ pollId: poll.id, hash: data });
      }
      return results;
    },
    enabled: polls.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmedQ = question.trim();
      const trimmedOpts = options.map((o) => o.trim()).filter((o) => o.length > 0);
      if (!trimmedQ || trimmedOpts.length < 2 || !currentBuildingId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any).from("building_polls").insert({
        building_id: currentBuildingId,
        question: trimmedQ,
        options: trimmedOpts,
        created_by: user.id,
        ends_at: endsAt ? new Date(endsAt.getFullYear(), endsAt.getMonth(), endsAt.getDate(), 23, 59, 59).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-polls", currentBuildingId] });
      toast({ title: "نظرسنجی ایجاد شد" });
      setCreateOpen(false);
      setQuestion("");
      setOptions(["", ""]);
      setEndsAt(undefined);
    },
    onError: (err: any) => {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      if (!currentBuildingId) return;
      const { data: hash } = await supabase.rpc("get_voter_hash", { _poll_id: pollId });
      if (!hash) throw new Error("خطا در دریافت هش");

      const existing = allVotes.find((v) => v.poll_id === pollId && v.voter_hash === hash);
      if (existing) {
        const { error } = await (supabase as any)
          .from("building_poll_votes")
          .update({ selected_option: optionIndex })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("building_poll_votes").insert({
          poll_id: pollId,
          building_id: currentBuildingId,
          voter_hash: hash,
          selected_option: optionIndex,
        });
        if (error) {
          if (error.code === "23505") throw new Error("شما قبلاً رأی داده‌اید");
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-poll-votes", currentBuildingId] });
      queryClient.invalidateQueries({ queryKey: ["my-voter-hashes"] });
      toast({ title: "رأی شما ثبت شد" });
    },
    onError: (err: any) => {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("building_polls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-polls", currentBuildingId] });
      toast({ title: "نظرسنجی حذف شد" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "خطا در حذف", description: err.message, variant: "destructive" });
    },
  });

  const closePollMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("building_polls")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-polls", currentBuildingId] });
      toast({ title: "نظرسنجی بسته شد" });
    },
  });

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };
  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };
  const updateOption = (idx: number, val: string) => {
    const newOpts = [...options];
    newOpts[idx] = val;
    setOptions(newOpts);
  };

  const hasVoted = (pollId: string) => {
    const myHash = myHashes.find((h) => h.pollId === pollId);
    if (!myHash) return false;
    return allVotes.some((v) => v.poll_id === pollId && v.voter_hash === myHash.hash);
  };

  const getVoteCounts = (pollId: string, optionsCount: number) => {
    const votes = allVotes.filter((v) => v.poll_id === pollId);
    const counts = Array.from({ length: optionsCount }, (_, i) =>
      votes.filter((v) => v.selected_option === i).length
    );
    return { counts, total: votes.length };
  };

  if (!currentBuildingId) return null;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          نظرسنجی جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>هنوز نظرسنجی ایجاد نشده است</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const voted = hasVoted(poll.id);
            const { counts, total } = getVoteCounts(poll.id, (poll.options as string[]).length);
            const expired = !!poll.ends_at && new Date(poll.ends_at).getTime() < Date.now();
            const isOpen = poll.is_active && !expired;
            const showResults = voted || !isOpen;
            const myHash = myHashes.find((h) => h.pollId === poll.id)?.hash;
            const myVote = myHash
              ? allVotes.find((v) => v.poll_id === poll.id && v.voter_hash === myHash)?.selected_option
              : undefined;

            return (
              <Card key={poll.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{poll.question}</CardTitle>
                      <Badge variant={isOpen ? "default" : "secondary"}>
                        {isOpen ? "فعال" : (expired ? "منقضی شده" : "بسته شده")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {poll.is_active && (
                        <Button variant="outline" size="sm" onClick={() => closePollMutation.mutate(poll.id)}>
                          بستن
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(poll.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(poll.options as string[]).map((opt, idx) => {
                    const pct = total > 0 ? Math.round((counts[idx] / total) * 100) : 0;
                    const isMine = myVote === idx;
                    return (
                      <div key={idx}>
                        {showResults ? (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-sm gap-2">
                              <div className="flex items-center gap-1">
                                {isMine && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                <span className={isMine ? "font-medium text-primary" : ""}>{opt}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{counts[idx]} رأی ({pct}%)</span>
                                {isOpen && !isMine && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => voteMutation.mutate({ pollId: poll.id, optionIndex: idx })}
                                    disabled={voteMutation.isPending}
                                  >
                                    تغییر به این
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => voteMutation.mutate({ pollId: poll.id, optionIndex: idx })}
                            disabled={voteMutation.isPending}
                          >
                            {opt}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {voted && (
                    <div className="flex items-center gap-1 text-xs text-primary mt-2">
                      <CheckCircle2 className="w-3 h-3" />
                      {isOpen ? "رأی شما ثبت شده است — تا پایان نظرسنجی قابل تغییر است" : "رأی شما ثبت شده است (بدون نام)"}
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{total} رأی</span>
                    <span>
                      {formatJalaliDate(poll.created_at)}
                      {poll.ends_at && ` — پایان: ${formatJalaliDate(poll.ends_at)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>نظرسنجی جدید</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>سؤال</Label>
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label>گزینه‌ها</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`گزینه ${idx + 1}`}
                    maxLength={200}
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeOption(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                  <Plus className="w-3 h-3" />
                  افزودن گزینه
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>تاریخ پایان (اختیاری)</Label>
              <JalaliDatePicker value={endsAt} onChange={setEndsAt} placeholder="بدون تاریخ پایان" />
              {endsAt && (
                <Button variant="ghost" size="sm" onClick={() => setEndsAt(undefined)} className="h-7 text-xs">
                  حذف تاریخ پایان
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">رأی‌گیری به صورت بدون نام انجام می‌شود و هویت رأی‌دهندگان مشخص نخواهد شد.</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!question.trim() || options.filter((o) => o.trim()).length < 2 || createMutation.isPending}
            >
              {createMutation.isPending ? "در حال ایجاد..." : "ایجاد نظرسنجی"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف نظرسنجی</AlertDialogTitle>
            <AlertDialogDescription>آیا از حذف این نظرسنجی و تمام رأی‌ها اطمینان دارید؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
