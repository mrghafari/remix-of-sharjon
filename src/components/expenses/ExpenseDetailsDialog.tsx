import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileSpreadsheet, FileText, Loader2, Paperclip, Download, ExternalLink, Upload, Trash2 } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { Expense } from "@/hooks/useExpenses";
import { useExpenseShares } from "@/hooks/useExpenseShares";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { toast } from "@/hooks/use-toast";
import { formatJalaliDate } from "@/lib/jalaliDate";
import {
  exportToExcel,
  exportToPDF,
  formatNumber,
  UnitAllocation,
} from "@/lib/exportUtils";

interface ExpenseDetailsDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExpenseAttachment {
  id: string;
  file_name: string;
  file_path: string;
}

const allocationLabels: Record<string, string> = {
  single_unit: "واحد خاص",
  by_area: "بر اساس متراژ",
  by_residents: "بر اساس تعداد نفرات",
  by_area_residents: "ترکیب متراژ و نفرات",
  equal: "تقسیم مساوی",
};

const fundTypeLabels: Record<string, string> = {
  charge: "صندوق شارژ",
  extra_charge: "صندوق فوق شارژ",
};

export function ExpenseDetailsDialog({
  expense,
  open,
  onOpenChange,
}: ExpenseDetailsDialogProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { currentBuildingId } = useBuilding();
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const { data: shares = [], isLoading: sharesLoading } = useExpenseShares();

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery({
    queryKey: ["expense_attachments", expense?.id],
    queryFn: async () => {
      if (!expense) return [];
      const { data, error } = await supabase
        .from("expense_attachments")
        .select("id, file_name, file_path")
        .eq("expense_id", expense.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ExpenseAttachment[];
    },
    enabled: !!expense,
  });

  const getAttachmentUrl = async (filePath: string) => {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("expense-attachments")
      .createSignedUrl(filePath, 60 * 60);

    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }

    const { data } = supabase.storage.from("expense-attachments").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleAttachmentAction = async (att: ExpenseAttachment, mode: "view" | "download") => {
    try {
      setActiveAttachmentId(att.id);
      const url = await getAttachmentUrl(att.file_path);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = att.file_name;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setActiveAttachmentId(null);
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !expense || !currentBuildingId) return;
    const files = Array.from(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
        const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "bin";
        const filePath = `${currentBuildingId}/${expense.id}/${Date.now()}_${i}_${crypto.randomUUID()}.${safeExtension}`;
        const { error: uploadError } = await supabase.storage
          .from("expense-attachments")
          .upload(filePath, file);
        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        const { error: insertError } = await supabase.from("expense_attachments").insert({
          expense_id: expense.id,
          building_id: currentBuildingId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        });
        if (insertError) {
          console.error("DB insert error:", insertError);
          continue;
        }
        successCount++;
      }

      await queryClient.invalidateQueries({ queryKey: ["expense_attachments", expense.id] });
      await queryClient.invalidateQueries({ queryKey: ["expense-attachment-counts"] });

      toast({
        title: successCount === files.length ? "موفق" : "هشدار",
        description: `${successCount} از ${files.length} فایل آپلود شد`,
        variant: successCount === files.length ? "default" : "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (att: ExpenseAttachment) => {
    if (!expense) return;
    setDeletingId(att.id);
    try {
      await supabase.storage.from("expense-attachments").remove([att.file_path]);
      const { error } = await supabase
        .from("expense_attachments")
        .delete()
        .eq("id", att.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["expense_attachments", expense.id] });
      await queryClient.invalidateQueries({ queryKey: ["expense-attachment-counts"] });
      toast({ title: "حذف شد", description: "پیوست با موفقیت حذف شد" });
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "خطا", description: "خطا در حذف پیوست", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (!expense) return null;

  // Get stored shares for this expense
  const expenseShares = shares.filter((s) => s.expense_id === expense.id);

  const unitAllocations: UnitAllocation[] = units
    .map((unit) => {
      const share = expenseShares.find((s) => s.unit_id === unit.id);
      return {
        unitNumber: unit.unit_number,
        ownerName: unit.owner_name,
        residentName: unit.resident_name,
        area: unit.area,
        residentCount: unit.resident_count,
        isManager: false,
        isVacant: unit.is_occupied === false,
        allocatedAmount: share ? Number(share.allocated_amount) : 0,
      };
    })
    .filter((ua) => ua.allocatedAmount > 0);

  const totalAllocated = unitAllocations.reduce(
    (sum, ua) => sum + ua.allocatedAmount,
    0
  );

  const handleExportExcel = () => {
    exportToExcel(unitAllocations, expense.title, totalAllocated);
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      await exportToPDF("expense-details-content", expense.title);
      setIsGeneratingPDF(false);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader className="text-right sm:text-right flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">جزئیات تخصیص هزینه</DialogTitle>
          <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">بستن</span>
          </DialogClose>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            خروجی اکسل
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            خروجی PDF
          </Button>
        </div>

        <div id="expense-details-content" className="bg-background p-4" dir="rtl">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">عنوان هزینه</p>
              <p className="font-bold">{expense.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مبلغ کل</p>
              <p className="font-bold text-primary">
                {formatNumber(expense.amount)} تومان
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تاریخ</p>
              <p className="font-medium">{formatJalaliDate(expense.expense_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">نوع صندوق</p>
              <Badge variant="secondary">
                {fundTypeLabels[expense.fund_type] || expense.fund_type}
              </Badge>
            </div>
          </div>

          <div className="mb-4">
            <Badge variant="outline" className="text-sm">
              روش تسهیم: {allocationLabels[expense.allocation_type] || expense.allocation_type}
            </Badge>
            {expense.allocation_type === "by_area_residents" && expense.area_ratio && (
              <Badge variant="outline" className="text-sm mr-2">
                نسبت متراژ: {expense.area_ratio}%
              </Badge>
            )}
          </div>

          {/* Allocations Table */}
          {unitsLoading || sharesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : unitAllocations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              هیچ تخصیصی برای این هزینه وجود ندارد
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">ردیف</TableHead>
                  <TableHead className="text-right">شماره واحد</TableHead>
                  <TableHead className="text-right">شخص</TableHead>
                  <TableHead className="text-right">متراژ</TableHead>
                  <TableHead className="text-right">تعداد نفرات</TableHead>
                  <TableHead className="text-right">مبلغ تخصیص یافته</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitAllocations.map((ua, index) => (
                  <TableRow key={ua.unitNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{ua.unitNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{ua.residentName || ua.ownerName || "-"}</span>
                        <Badge variant="outline" className="text-xs">
                          {ua.residentName ? "ساکن" : "مالک"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{ua.area ? `${ua.area} متر` : "-"}</TableCell>
                    <TableCell>{ua.residentCount || "-"}</TableCell>
                    <TableCell className="font-bold text-primary">
                      {formatNumber(ua.allocatedAmount)} تومان
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={5} className="text-left">
                    جمع کل
                  </TableCell>
                  <TableCell className="text-primary">
                    {formatNumber(totalAllocated)} تومان
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {/* Attachments management */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h3 className="font-semibold flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                مستندات پیوست ({attachments.length})
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  افزودن پیوست
                </Button>
              </div>
            </div>

            {attachmentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/20">
                هیچ پیوستی برای این هزینه ثبت نشده است
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm truncate">{att.file_name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleAttachmentAction(att, "view")}
                      disabled={activeAttachmentId === att.id}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleAttachmentAction(att, "download")}
                      disabled={activeAttachmentId === att.id}
                    >
                      {activeAttachmentId === att.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteId(att.id)}
                      disabled={deletingId === att.id}
                    >
                      {deletingId === att.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف پیوست</AlertDialogTitle>
                <AlertDialogDescription>
                  آیا از حذف این پیوست اطمینان دارید؟ این عمل قابل بازگشت نیست.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>انصراف</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const att = attachments.find((a) => a.id === confirmDeleteId);
                    if (att) handleDeleteAttachment(att);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
