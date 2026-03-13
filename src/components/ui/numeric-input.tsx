import * as React from "react";
import { cn } from "@/lib/utils";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Numeric input that displays thousand separators (no decimals).
 * Stores raw digits as string, displays formatted with commas.
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, dir, ...props }, ref) => {
    const formatDisplay = (raw: string) => {
      if (!raw) return "";
      return Number(raw).toLocaleString("en-US");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      onChange(raw);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        dir="ltr"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        value={formatDisplay(value)}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";

export { NumericInput };
