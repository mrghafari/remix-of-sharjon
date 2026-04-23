import { parse, endOfMonth, startOfMonth } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

/**
 * Returns the gregorian Date representing the END of the given Jalali month/year (last day, 23:59:59.999).
 */
export function endOfJalaliMonth(jYear: number, jMonth: number): Date {
  // Build a jalali date string for day 1 then take endOfMonth
  const monthStr = String(jMonth).padStart(2, "0");
  const d = parse(`${jYear}/${monthStr}/01`, "yyyy/MM/dd", new Date(), { locale: faIR });
  return endOfMonth(d);
}

export function startOfJalaliMonth(jYear: number, jMonth: number): Date {
  const monthStr = String(jMonth).padStart(2, "0");
  const d = parse(`${jYear}/${monthStr}/01`, "yyyy/MM/dd", new Date(), { locale: faIR });
  return startOfMonth(d);
}

/** ISO date (YYYY-MM-DD) of last day of jalali month */
export function endOfJalaliMonthIso(jYear: number, jMonth: number): string {
  return endOfJalaliMonth(jYear, jMonth).toISOString().split("T")[0];
}
