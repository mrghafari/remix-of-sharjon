import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { UnitBalance, DateRange } from "@/hooks/useUnitBalanceFiltered";
import { formatJalaliDate, toJalaliString } from "@/lib/jalaliDate";

// Extend jsPDF type for autoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

const allocationLabels: Record<string, string> = {
  equal: "مساوی",
  by_area: "متراژ",
  by_residents: "نفرات",
  by_area_residents: "متراژ و نفرات",
  single_unit: "واحد خاص",
};

function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
}

function formatDateRange(range: DateRange): string {
  if (!range.from && !range.to) return "تمام دوره‌ها";
  if (range.from && range.to) {
    return `${toJalaliString(range.from)} تا ${toJalaliString(range.to)}`;
  }
  if (range.from) return `از ${toJalaliString(range.from)}`;
  if (range.to) return `تا ${toJalaliString(range.to)}`;
  return "تمام دوره‌ها";
}

export function generateUnitReportPDF(
  unitBalance: UnitBalance,
  dateRange: DateRange,
  categoryLabels: Record<string, string>
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set RTL and font - using built-in helvetica for now
  // For full Persian support, a Persian font would need to be embedded
  doc.setR2L(true);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.text("گزارش مالی واحد", pageWidth - margin, yPos, { align: "right" });
  yPos += 12;

  // Unit Info
  doc.setFontSize(12);
  doc.text(`پلاک: ${unitBalance.unit.unit_number}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 7;
  doc.text(`مالک: ${unitBalance.unit.owner_name}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 7;
  doc.text(`بازه زمانی: ${formatDateRange(dateRange)}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 7;
  doc.text(`تاریخ گزارش: ${toJalaliString(new Date())}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 12;

  // Summary Box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 30, "F");
  
  doc.setFontSize(11);
  const summaryY = yPos + 8;
  doc.text(`کل دریافتی‌ها: ${formatNumber(unitBalance.totalPayments)} تومان`, pageWidth - margin - 5, summaryY, { align: "right" });
  doc.text(`کل هزینه‌های تسهیم‌شده: ${formatNumber(unitBalance.totalAllocatedExpenses)} تومان`, pageWidth - margin - 5, summaryY + 8, { align: "right" });
  
  const balanceText = unitBalance.balance >= 0 
    ? `مانده (بستانکار): ${formatNumber(unitBalance.balance)} تومان`
    : `مانده (بدهکار): ${formatNumber(Math.abs(unitBalance.balance))} تومان`;
  doc.text(balanceText, pageWidth - margin - 5, summaryY + 16, { align: "right" });
  
  yPos += 38;

  // Payments Table
  doc.setFontSize(13);
  doc.text("دریافتی‌ها (پرداخت‌های واحد)", pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  if (unitBalance.paymentBreakdown.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["توضیحات", "مبلغ (تومان)", "نوع صندوق", "دوره", "تاریخ"]],
      body: unitBalance.paymentBreakdown.map((p) => [
        p.description || "-",
        formatNumber(p.amount),
        p.fund_type === "charge" ? "شارژ" : "شارژ اضافی",
        `${p.month}/${p.year}`,
        formatJalaliDate(p.payment_date),
      ]),
      styles: {
        font: "helvetica",
        halign: "right",
        fontSize: 9,
      },
      headStyles: {
        fillColor: [34, 139, 34],
        textColor: 255,
        halign: "right",
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
    });
    yPos = doc.lastAutoTable.finalY + 10;
  } else {
    yPos += 5;
    doc.setFontSize(10);
    doc.text("هنوز پرداختی ثبت نشده", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
  }

  // Check if need new page
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  // Expenses Table
  doc.setFontSize(13);
  doc.text("هزینه‌های تسهیم‌شده", pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  if (unitBalance.expenseBreakdown.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["سهم این واحد", "مبلغ کل", "نحوه تسهیم", "دسته‌بندی", "عنوان", "تاریخ"]],
      body: unitBalance.expenseBreakdown.map(({ expense, allocatedAmount }) => [
        formatNumber(allocatedAmount),
        formatNumber(expense.amount),
        allocationLabels[expense.allocation_type] || expense.allocation_type,
        categoryLabels[expense.category] || expense.category,
        expense.title,
        formatJalaliDate(expense.expense_date),
      ]),
      styles: {
        font: "helvetica",
        halign: "right",
        fontSize: 9,
      },
      headStyles: {
        fillColor: [220, 53, 69],
        textColor: 255,
        halign: "right",
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
    });
  } else {
    yPos += 5;
    doc.setFontSize(10);
    doc.text("هنوز هزینه‌ای تسهیم نشده", pageWidth / 2, yPos, { align: "center" });
  }

  // Save the PDF
  const fileName = `گزارش-واحد-${unitBalance.unit.unit_number}-${toJalaliString(new Date()).replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
