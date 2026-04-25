import { UnitBalance, DateRange } from "@/hooks/useUnitBalanceFiltered";
import { formatJalaliDate, toJalaliString } from "@/lib/jalaliDate";

interface UnitReportPrintableProps {
  unitBalance: UnitBalance;
  dateRange: DateRange;
  categoryLabels: Record<string, string>;
}

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

const allocationLabels: Record<string, string> = {
  equal: "مساوی",
  by_area: "متراژ",
  by_residents: "نفرات",
  by_area_residents: "متراژ و نفرات",
  single_unit: "واحد خاص",
};

export function UnitReportPrintable({ unitBalance, dateRange, categoryLabels }: UnitReportPrintableProps) {
  return (
    <div 
      id="pdf-report-content"
      dir="rtl"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm",
        backgroundColor: "white",
        fontFamily: "Vazirmatn, Tahoma, Arial, sans-serif",
        fontSize: "12px",
        color: "#1a1a1a",
        lineHeight: "1.6",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #333", paddingBottom: "15px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 10px 0" }}>گزارش مالی واحد</h1>
        <p style={{ margin: "5px 0", fontSize: "14px" }}>پلاک: {unitBalance.unit.unit_number} | مالک: {unitBalance.unit.owner_name}</p>
        <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
          بازه زمانی: {formatDateRange(dateRange)} | تاریخ گزارش: {toJalaliString(new Date())}
        </p>
      </div>

      {/* Summary Box */}
      <div style={{ 
        backgroundColor: "#f5f5f5", 
        padding: "15px", 
        borderRadius: "8px", 
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-around",
        textAlign: "center"
      }}>
        <div>
          <div style={{ fontSize: "11px", color: "#666" }}>کل دریافتی‌ها</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#16a34a" }}>
            {formatNumber(unitBalance.totalPayments)} تومان
          </div>
        </div>
        <div style={{ borderRight: "1px solid #ddd", borderLeft: "1px solid #ddd", padding: "0 20px" }}>
          <div style={{ fontSize: "11px", color: "#666" }}>کل هزینه‌های تسهیم‌شده</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#dc2626" }}>
            {formatNumber(unitBalance.totalAllocatedExpenses)} تومان
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "#666" }}>مانده حساب</div>
          <div style={{ 
            fontSize: "16px", 
            fontWeight: "bold", 
            color: unitBalance.balance >= 0 ? "#16a34a" : "#dc2626" 
          }}>
            {formatNumber(Math.abs(unitBalance.balance))} تومان
            <span style={{ fontSize: "12px", marginRight: "5px" }}>
              ({unitBalance.balance >= 0 ? "بستانکار" : "بدهکار"})
            </span>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div style={{ marginBottom: "25px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#16a34a", marginBottom: "10px", borderBottom: "1px solid #16a34a", paddingBottom: "5px" }}>
          دریافتی‌ها (پرداخت‌های واحد)
        </h2>
        {unitBalance.paymentBreakdown.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ backgroundColor: "#16a34a", color: "white" }}>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>تاریخ</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>دوره</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>نوع صندوق</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>مبلغ (تومان)</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {unitBalance.paymentBreakdown.map((p, idx) => (
                <tr key={p.id} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{formatJalaliDate(p.payment_date)}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{p.month}/{p.year}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{p.fund_type === "charge" ? "شارژ" : "فوق شارژ"}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd", color: "#16a34a", fontWeight: "bold" }}>{formatNumber(p.amount)}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{p.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>هنوز پرداختی ثبت نشده</p>
        )}
      </div>

      {/* Expenses Table */}
      <div>
        <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#dc2626", marginBottom: "10px", borderBottom: "1px solid #dc2626", paddingBottom: "5px" }}>
          هزینه‌های تسهیم‌شده
        </h2>
        {unitBalance.expenseBreakdown.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ backgroundColor: "#dc2626", color: "white" }}>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>تاریخ</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>عنوان</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>دسته‌بندی</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>نحوه تسهیم</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>مبلغ کل</th>
                <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>سهم این واحد</th>
              </tr>
            </thead>
            <tbody>
              {unitBalance.expenseBreakdown.map(({ expense, allocatedAmount }, idx) => (
                <tr key={expense.id} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{formatJalaliDate(expense.expense_date)}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{expense.title}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{categoryLabels[expense.category] || expense.category}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{allocationLabels[expense.allocation_type] || expense.allocation_type}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>{formatNumber(expense.amount)}</td>
                  <td style={{ padding: "8px", border: "1px solid #ddd", color: "#dc2626", fontWeight: "bold" }}>{formatNumber(allocatedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>هنوز هزینه‌ای تسهیم نشده</p>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "30px", paddingTop: "15px", borderTop: "1px solid #ddd", textAlign: "center", fontSize: "10px", color: "#999" }}>
        این گزارش توسط سیستم مدیریت ساختمان تولید شده است
      </div>
    </div>
  );
}
