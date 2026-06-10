import { useState, useEffect } from "react";
import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

export function ShamsiDateDisplay({ className = "" }: { className?: string }) {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDateStr(format(now, "EEEE d MMMM yyyy", { locale: faIR }));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={`text-sm font-medium text-foreground/80 tabular-nums whitespace-nowrap ${className}`}
    >
      {dateStr}
    </span>
  );
}
