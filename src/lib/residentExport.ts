import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toJalaliString, formatJalaliDate } from "@/lib/jalaliDate";

const fmt = (n: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.round(n));

const fundLabel = (f?: string) => (f === "extra_charge" ? "فوق‌شارژ" : "شارژ");

const dateStamp = () => toJalaliString(new Date()).replace(/\//g, "-");

const rangeLabel = (from?: Date, to?: Date) => {
  const f = from ? toJalaliString(from) : "ابتدا";
  const t = to ? toJalaliString(to) : "امروز";
  return `${f} تا ${t}`;
};

export interface ResidentPayment {
  payment_date: string;
  amount: number;
  fund_type: string;
  description?: string | null;
  owner_name?: string | null;
  resident_name?: string | null;
  manager_name?: string | null;
}

export interface ResidentExpenseShare {
  allocated_amount: number;
  owner_name?: string | null;
  resident_name?: string | null;
  manager_name?: string | null;
  expenses?: {
    title?: string;
    expense_date?: string;
    fund_type?: string;
    amount?: number;
  } | null;
}

export const exportPaymentsExcel = (
  rows: ResidentPayment[],
  unitNumber: string,
  from?: Date,
  to?: Date
) => {
  const data = rows.map((p, i) => ({
    ردیف: i + 1,
    تاریخ: formatJalaliDate(p.payment_date),
    شخص: p.resident_name || p.owner_name || "-",
    نقش: p.resident_name ? "ساکن" : p.owner_name ? "مالک" : "-",
    مدیر: p.manager_name || "-",
    توضیحات: p.description || "-",
    نوع: fundLabel(p.fund_type),
    "مبلغ (ریال)": Math.round(Number(p.amount)),
  }));
  const total = rows.reduce((s, p) => s + Number(p.amount), 0);
  data.push({
    ردیف: "" as any,
    تاریخ: "",
    شخص: "",
    نقش: "",
    مدیر: "",
    توضیحات: "جمع کل",
    نوع: "",
    "مبلغ (ریال)": Math.round(total),
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ width: 6 }, { width: 14 }, { width: 18 }, { width: 8 }, { width: 18 }, { width: 28 }, { width: 12 }, { width: 16 }];
  (ws as any)["!dir"] = "rtl";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "پرداختی‌ها");
  XLSX.writeFile(wb, `پرداختی‌ها-واحد${unitNumber}-${dateStamp()}.xlsx`);
};

export const exportExpensesExcel = (
  rows: ResidentExpenseShare[],
  unitNumber: string,
  from?: Date,
  to?: Date
) => {
  const data = rows.map((e, i) => {
    const isExtra = (e.expenses?.fund_type ?? "charge") === "extra_charge";
    const preferred = isExtra ? e.owner_name : e.resident_name;
    const fallback = isExtra ? e.resident_name : e.owner_name;
    const personName = preferred || fallback || "-";
    const role = preferred ? (isExtra ? "مالک" : "ساکن") : fallback ? (isExtra ? "ساکن" : "مالک") : "-";
    return {
      ردیف: i + 1,
      تاریخ: e.expenses?.expense_date ? formatJalaliDate(e.expenses.expense_date) : "-",
      عنوان: e.expenses?.title || "-",
      شخص: personName,
      نقش: role,
      مدیر: e.manager_name || "-",
      نوع: fundLabel(e.expenses?.fund_type),
      "کل هزینه (ریال)": Math.round(Number(e.expenses?.amount || 0)),
      "سهم شما (ریال)": Math.round(Number(e.allocated_amount)),
    };
  });
  const total = rows.reduce((s, e) => s + Number(e.allocated_amount), 0);
  data.push({
    ردیف: "" as any,
    تاریخ: "",
    عنوان: "جمع کل",
    شخص: "",
    نقش: "",
    مدیر: "",
    نوع: "",
    "کل هزینه (ریال)": "" as any,
    "سهم شما (ریال)": Math.round(total),
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ width: 6 }, { width: 14 }, { width: 24 }, { width: 18 }, { width: 8 }, { width: 18 }, { width: 12 }, { width: 16 }, { width: 16 }];
  (ws as any)["!dir"] = "rtl";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "هزینه‌های تسهیم‌شده");
  XLSX.writeFile(wb, `هزینه‌های-تسهیم‌شده-واحد${unitNumber}-${dateStamp()}.xlsx`);
};

const buildHtmlTable = (title: string, subtitle: string, headers: string[], rows: string[][], totalLabel: string, totalValue: string) => {
  const headerRow = headers.map((h) => `<th style="border:1px solid #555;padding:6px 8px;background:#1e3a8a;color:#fff;font-size:12px">${h}</th>`).join("");
  const bodyRows = rows
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 === 0 ? "#fff" : "#f3f4f6"}">${r.map((c) => `<td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${c}</td>`).join("")}</tr>`
    )
    .join("");
  const totalCells = headers.map((_, i) => {
    if (i === 0) return `<td colspan="${headers.length - 1}" style="border:1px solid #555;padding:6px 8px;font-weight:bold;background:#fde68a;font-size:12px">${totalLabel}</td>`;
    if (i === headers.length - 1) return `<td style="border:1px solid #555;padding:6px 8px;font-weight:bold;background:#fde68a;font-size:12px">${totalValue}</td>`;
    return "";
  }).filter(Boolean).join("");
  return `
    <div dir="rtl" style="font-family:Vazirmatn,Vazir,Tahoma,sans-serif;padding:24px;background:#fff;width:1100px">
      <h1 style="font-size:20px;margin:0 0 4px 0;color:#1e3a8a">${title}</h1>
      <p style="margin:0 0 16px 0;color:#555;font-size:12px">${subtitle}</p>
      <table style="border-collapse:collapse;width:100%;direction:rtl">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}<tr>${totalCells}</tr></tbody>
      </table>
      <p style="margin-top:16px;font-size:10px;color:#888">تاریخ تولید گزارش: ${toJalaliString(new Date())}</p>
    </div>`;
};

const renderHtmlToPdf = async (html: string, fileName: string) => {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const node = container.firstElementChild as HTMLElement;
    const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
    const imgW = 297; // A4 landscape mm
    const pageH = 210;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pdf = new jsPDF("l", "mm", "a4");
    const img = canvas.toDataURL("image/png");
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(img, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(img, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
};

export const exportPaymentsPdf = async (
  rows: ResidentPayment[],
  unitNumber: string,
  from?: Date,
  to?: Date
) => {
  const headers = ["ردیف", "تاریخ", "شخص", "نقش", "مدیر", "توضیحات", "نوع", "مبلغ (ریال)"];
  const body = rows.map((p, i) => [
    String(i + 1),
    formatJalaliDate(p.payment_date),
    p.resident_name || p.owner_name || "-",
    p.resident_name ? "ساکن" : p.owner_name ? "مالک" : "-",
    p.manager_name || "-",
    p.description || "-",
    fundLabel(p.fund_type),
    fmt(Number(p.amount)),
  ]);
  const total = rows.reduce((s, p) => s + Number(p.amount), 0);
  const html = buildHtmlTable(
    `گزارش پرداختی‌های واحد ${unitNumber}`,
    `بازه: ${rangeLabel(from, to)} — تعداد: ${rows.length.toLocaleString("fa-IR")}`,
    headers,
    body,
    "جمع کل",
    `${fmt(total)} ریال`
  );
  await renderHtmlToPdf(html, `پرداختی‌ها-واحد${unitNumber}-${dateStamp()}.pdf`);
};

export const exportExpensesPdf = async (
  rows: ResidentExpenseShare[],
  unitNumber: string,
  from?: Date,
  to?: Date
) => {
  const headers = ["ردیف", "تاریخ", "عنوان", "شخص", "نقش", "مدیر", "نوع", "سهم شما (ریال)"];
  const body = rows.map((e, i) => {
    const isExtra = (e.expenses?.fund_type ?? "charge") === "extra_charge";
    const preferred = isExtra ? e.owner_name : e.resident_name;
    const fallback = isExtra ? e.resident_name : e.owner_name;
    const personName = preferred || fallback || "-";
    const role = preferred ? (isExtra ? "مالک" : "ساکن") : fallback ? (isExtra ? "ساکن" : "مالک") : "-";
    return [
      String(i + 1),
      e.expenses?.expense_date ? formatJalaliDate(e.expenses.expense_date) : "-",
      e.expenses?.title || "-",
      personName,
      role,
      e.manager_name || "-",
      fundLabel(e.expenses?.fund_type),
      fmt(Number(e.allocated_amount)),
    ];
  });
  const total = rows.reduce((s, e) => s + Number(e.allocated_amount), 0);
  const html = buildHtmlTable(
    `گزارش هزینه‌های تسهیم‌شده واحد ${unitNumber}`,
    `بازه: ${rangeLabel(from, to)} — تعداد: ${rows.length.toLocaleString("fa-IR")}`,
    headers,
    body,
    "جمع کل",
    `${fmt(total)} ریال`
  );
  await renderHtmlToPdf(html, `هزینه‌های-تسهیم‌شده-واحد${unitNumber}-${dateStamp()}.pdf`);
};

export const inDateRange = (dateStr: string | undefined, from?: Date, to?: Date) => {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
};
