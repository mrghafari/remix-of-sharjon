import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
  tooltip?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "bg-primary",
  delay = 0,
  tooltip,
}: StatsCardProps) {
  const card = (
    <Card
      variant="stats"
      className={cn("animate-fade-in opacity-0", tooltip && "cursor-help")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-sm font-medium",
                  changeType === "positive" && "text-success",
                  changeType === "negative" && "text-destructive",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              iconColor
            )}
          >
            <Icon className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!tooltip) return card;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
