import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { UnitBalance, DateRange } from "@/hooks/useUnitBalanceFiltered";
import { toJalaliString } from "@/lib/jalaliDate";

export async function generateUnitReportPDF(
  elementId: string = "pdf-report-content",
  unitNumber: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("PDF element not found");
    return;
  }

  if (typeof document !== "undefined" && (document as any).fonts?.ready) {
    try {
      await (document as any).fonts.ready;
      await Promise.all([
        (document as any).fonts.load('400 12px "Vazirmatn"'),
        (document as any).fonts.load('500 12px "Vazirmatn"'),
        (document as any).fonts.load('700 14px "Vazirmatn"'),
        (document as any).fonts.load('700 22px "Vazirmatn"'),
      ]);
    } catch {
      /* ignore */
    }
  }

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    foreignObjectRendering: true,
    onclone: async (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement instanceof HTMLElement) {
        clonedElement.style.fontFamily = 'Vazirmatn, Tahoma, Arial, sans-serif';
        clonedElement.style.direction = 'rtl';
        clonedElement.style.unicodeBidi = 'plaintext';
        clonedElement.style.textRendering = 'geometricPrecision';
        
      }

      if ((clonedDoc as any).fonts?.ready) {
        try {
          await (clonedDoc as any).fonts.ready;
        } catch {
          /* ignore */
        }
      }
    },
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

  const fileName = `گزارش-واحد-${unitNumber}-${toJalaliString(new Date()).replace(/\//g, "-")}.pdf`;
  pdf.save(fileName);
}
