import { ChargeSettings } from "@/components/settings/ChargeSettings";
import { ChargeHistory } from "./ChargeHistory";
import { LatePenaltyApplier } from "./LatePenaltyApplier";

export function ChargesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">شارژ واحدها</h1>
        <p className="text-muted-foreground mt-1">
          تنظیم مبالغ شارژ و فوق‌شارژ و اعمال برای واحدها
        </p>
      </div>
      <ChargeSettings />
      <LatePenaltyApplier />
      <ChargeHistory />
    </div>
  );
}
