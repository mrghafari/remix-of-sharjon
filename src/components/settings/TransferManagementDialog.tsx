import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Manager, useTransferManagement } from "@/hooks/useManagers";
import { ManagerRole } from "@/hooks/useManagerRoles";
import { toJalaliString, fromJalaliString, getTodayJalali, formatJalaliDate } from "@/lib/jalaliDate";

interface TransferManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: ManagerRole | null;
  currentActive: Manager | null;
  candidates: Manager[]; // all managers in same building (history + active for other roles), excluding currentActive
}

export function TransferManagementDialog({
  open,
  onOpenChange,
  role,
  currentActive,
  candidates,
}: TransferManagementDialogProps) {
  const transfer = useTransferManagement();
  const [selectedId, setSelectedId] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(getTodayJalali());

  useEffect(() => {
    if (open) {
      setSelectedId("");
      setEffectiveDate(getTodayJalali());
    }
  }, [open]);

  const handleSubmit = () => {
    if (!role || !selectedId) return;
    transfer.mutate(
      {
        role_id: role.id,
        new_manager_id: selectedId,
        effective_date: fromJalaliString(effectiveDate),
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const personLabel = (m: Manager) =>
    m.role_type === "external"
      ? m.external_name || "—"
      : `واحد ${m.unit?.unit_number} - ${m.role_type === "owner" ? m.unit?.owner_name : m.unit?.resident_name || m.unit?.owner_name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            انتقال «{role?.label}»
          </DialogTitle>
          <DialogDescription>
            {currentActive ? (
              <>
                مدیر فعلی: <span className="font-medium">{personLabel(currentActive)}</span>
                {" — "}
                از {formatJalaliDate(currentActive.start_date)}
              </>
            ) : (
              "در حال حاضر این نقش مدیر فعالی ندارد. می‌توانید مدیر جدید را از میان سوابق انتخاب کنید."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>مدیر جانشین</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="یکی از مدیران ثبت‌شده را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    مدیر دیگری ثبت نشده. ابتدا مدیر جدید را اضافه کنید.
                  </div>
                ) : (
                  candidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {personLabel(m)}
                      {m.role?.label ? ` • ${m.role.label}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>تاریخ مؤثر انتقال</Label>
            <JalaliDatePicker
              value={effectiveDate ? new Date(fromJalaliString(effectiveDate)) : undefined}
              onChange={(d) => setEffectiveDate(d ? toJalaliString(d) : "")}
              placeholder="انتخاب تاریخ"
            />
          </div>

          <Button
            className="w-full"
            disabled={!selectedId || transfer.isPending}
            onClick={handleSubmit}
          >
            {transfer.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            انتقال مدیریت
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
