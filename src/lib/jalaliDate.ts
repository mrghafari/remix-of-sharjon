import { format } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";

export const formatJalaliDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "yyyy/MM/dd", { locale: faIR });
};

export const formatJalaliDateFull = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "d MMMM yyyy", { locale: faIR });
};
