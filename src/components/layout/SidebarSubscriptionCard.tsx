import { Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMySubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface Props {
  showLabels: boolean;
  onClick: () => void;
}

export function SidebarSubscriptionCard({ showLabels, onClick }: Props) {
  const { data: sub } = useMySubscription();

  if (!sub) {
    if (!showLabels) {
      return (
        <Button variant="ghost" size="icon" className="w-full text-amber-500" onClick={onClick}>
          <Zap className="w-4 h-4" />
        </Button>
      );
    }
    return (
      <button
        onClick={onClick}
        className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200 hover:bg-amber-500/20 transition"
      >
        خرید اعتبار
      </button>
    );
  }

  const days = sub.days_remaining ?? 0;
  const critical = days <= 15;
  const used = sub.units_used ?? 0;
  const quota = sub.unit_quota ?? 0;

  if (!showLabels) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("w-full relative", critical ? "text-destructive" : "text-sidebar-foreground")}
        onClick={onClick}
        title={`${days} روز / ${used} از ${quota} واحد`}
      >
        <Clock className="w-4 h-4" />
        {critical && (
          <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
        )}
      </Button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg p-2 text-right transition border",
        critical
          ? "border-destructive/50 bg-destructive/10 hover:bg-destructive/20"
          : "border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-sidebar-foreground/70">اعتبار اشتراک</span>
        <Clock className={cn("w-3 h-3", critical && "text-destructive")} />
      </div>
      <div className={cn("text-xs font-bold", critical && "text-destructive")}>
        {days.toLocaleString("fa-IR")} روز باقی‌مانده
      </div>
      <div className="text-[10px] text-sidebar-foreground/60 mt-0.5">
        {used.toLocaleString("fa-IR")} از {quota.toLocaleString("fa-IR")} واحد
      </div>
      <div className="text-[10px] mt-1 text-primary-foreground/90 underline">
        {days === 0 ? "تمدید اعتبار" : critical ? "تمدید فوری" : "خرید/تمدید"}
      </div>
    </button>
  );
}
