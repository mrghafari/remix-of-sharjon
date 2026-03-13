import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toJalaliString } from "@/lib/jalaliDate";

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
};

export interface UnitAllocation {
  unitNumber: string;
  ownerName: string;
  residentName: string | null;
  area: number | null;
  residentCount: number | null;
  allocatedAmount: number;
  isManager?: boolean;
  isVacant?: boolean;
}

export const exportToExcel = (
  data: UnitAllocation[],
  expenseTitle: string,
  totalAmount: number
) => {
  const excelData = data.map((item, index) => ({
    ردیف: index + 1,
    "شماره واحد": item.unitNumber,
    "نام مالک": item.ownerName,
    "نام ساکن": item.residentName || "-",
    "متراژ (متر مربع)": item.area || "-",
    "تعداد نفرات": item.residentCount || "-",
    "مبلغ تخصیص یافته (تومان)": Math.round(item.allocatedAmount),
  }));

  // Add total row
  excelData.push({
    ردیف: "" as any,
    "شماره واحد": "",
    "نام مالک": "",
    "نام ساکن": "",
    "متراژ (متر مربع)": "" as any,
    "تعداد نفرات": "" as any,
    "مبلغ تخصیص یافته (تومان)": totalAmount,
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set RTL direction
  worksheet["!cols"] = [
    { width: 8 },
    { width: 15 },
    { width: 20 },
    { width: 20 },
    { width: 18 },
    { width: 15 },
    { width: 25 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "تخصیص هزینه");

  const fileName = `تخصیص-هزینه-${expenseTitle}-${toJalaliString(new Date()).replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const exportToPDF = async (
  elementId: string,
  expenseTitle: string
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("PDF element not found");
    return;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const fileName = `تخصیص-هزینه-${expenseTitle}-${toJalaliString(new Date()).replace(/\//g, "-")}.pdf`;
  pdf.save(fileName);
};
