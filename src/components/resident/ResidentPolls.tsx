import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  buildingId: string;
}

export function ResidentPolls({ buildingId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["resident_polls", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_polls")
        .select("*")
        .eq("building_id", buildingId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const now = Date.now();
      return (data || []).filter((p: any) => !p.ends_at || new Date(p.ends_at).getTime() >= now);
    },
  });

  const { data: votes = [] } = useQuery({
    queryKey: ["resident_poll_votes", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_poll_votes")
        .select("*")
        .eq("building_id", buildingId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: myHashes = [] } = useQuery({
    queryKey: ["resident_voter_hashes", buildingId, polls.map((p: any) => p.id).join(",")],
    queryFn: async () => {
      const results: { pollId: string; hash: string }[] = [];
      for (const poll of polls as any[]) {
        const { data } = await supabase.rpc("get_voter_hash", { _poll_id: poll.id });
        if (data) results.push({ pollId: poll.id, hash: data });
      }
      return results;
    },
    enabled: polls.length > 0,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      const { data: hash } = await supabase.rpc("get_voter_hash", { _poll_id: pollId });
      if (!hash) throw new Error("خطا");
      // Check if vote exists for this hash
      const existing = votes.find((v: any) => v.poll_id === pollId && v.voter_hash === hash);
      if (existing) {
        const { error } = await supabase
          .from("building_poll_votes")
          .update({ selected_option: optionIndex })
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("building_poll_votes").insert({
          poll_id: pollId,
          building_id: buildingId,
          selected_option: optionIndex,
          voter_hash: hash,
        });
        if (error) {
          if (error.code === "23505") throw new Error("شما قبلاً رأی داده‌اید");
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resident_poll_votes"] });
      toast({ title: "رأی شما ثبت شد" });
    },
    onError: (err: any) => {
      toast({ title: "خطا", description: err.message, variant: "destructive" });
    },
  });

  const myVoteFor = (pollId: string): number | null => {
    const myHash = myHashes.find((h) => h.pollId === pollId)?.hash;
    if (!myHash) return null;
    const v = votes.find((v: any) => v.poll_id === pollId && v.voter_hash === myHash);
    return v ? (v as any).selected_option : null;
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
          <p>نظرسنجی فعالی وجود ندارد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {polls.map((poll) => {
        const options = (poll.options as any[]) || [];
        const myVote = myVoteFor(poll.id);

        return (
          <Card key={poll.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{poll.question}</CardTitle>
              {(poll as any).ends_at && (
                <p className="text-xs text-muted-foreground">
                  پایان: {new Date((poll as any).ends_at).toLocaleDateString("fa-IR")}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {options.map((opt: any, i: number) => {
                const isMine = myVote === i;
                return (
                  <div key={i}>
                    <Button
                      variant={isMine ? "default" : "outline"}
                      size="sm"
                      className={`text-sm h-auto py-1.5 px-3 w-full justify-start ${
                        isMine ? "" : "bg-primary/10 hover:bg-primary/20 border-primary/30"
                      }`}
                      onClick={() => voteMutation.mutate({ pollId: poll.id, optionIndex: i })}
                      disabled={voteMutation.isPending || isMine}
                    >
                      {isMine && <CheckCircle2 className="w-3 h-3 ml-1" />}
                      {typeof opt === "string" ? opt : opt.text || `گزینه ${i + 1}`}
                    </Button>
                  </div>
                );
              })}
              {myVote !== null && (
                <p className="text-xs text-muted-foreground pt-1">
                  رأی شما ثبت شده است — تا پایان نظرسنجی قابل تغییر است.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
