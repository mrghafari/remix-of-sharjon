import { useState, useMemo } from "react";
import { useBuilding } from "@/contexts/BuildingContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsSuperAdmin } from "@/hooks/useAdmin";
import {
  useSupportTickets,
  useCreateTicket,
  useDeleteTicket,
  useUpdateTicket,
  PRIORITY_LABELS,
  STATUS_LABELS,
  CATEGORY_LABELS,
  type SupportTicket,
  type TicketPriority,
  type TicketCategory,
  type TicketStatus,
} from "@/hooks/useSupportTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, Trash2, Clock, AlertCircle, CheckCircle2, Loader2, Search } from "lucide-react";
import { format, parseISO } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { TicketConversation } from "./TicketConversation";
import { cn } from "@/lib/utils";

const priorityColor: Record<TicketPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/15 text-primary",
  high: "bg-warning/20 text-warning-foreground",
  urgent: "bg-destructive/20 text-destructive",
};

const statusColor: Record<TicketStatus, string> = {
  open: "bg-primary/15 text-primary",
  in_progress: "bg-warning/20 text-warning-foreground",
  answered: "bg-success/20 text-success-foreground",
  closed: "bg-muted text-muted-foreground",
};

interface TicketsPageProps {
  /** When true, show all tickets across all buildings (super admin view) */
  superAdminMode?: boolean;
}

export function TicketsPage({ superAdminMode = false }: TicketsPageProps) {
  const { user } = useAuth();
  const { currentBuilding } = useBuilding();
  const { data: isSuperAdmin } = useIsSuperAdmin(user?.id);
  const isAdmin = !!isSuperAdmin && superAdminMode;

  const buildingId = currentBuilding?.id;
  const { data: tickets = [], isLoading } = useSupportTickets(buildingId, isAdmin);
  const createTicket = useCreateTicket();
  const deleteTicket = useDeleteTicket();
  const updateTicket = useUpdateTicket();

  const [openNew, setOpenNew] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TicketStatus | "all">("all");

  // New ticket form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<TicketCategory>("support");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.creator_name.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, filterStatus]);

  const selectedTicket = tickets.find((t) => t.id === selectedId) || null;

  const handleCreate = () => {
    if (!subject.trim() || !description.trim() || !user || !buildingId) return;
    createTicket.mutate(
      {
        building_id: buildingId,
        created_by: user.id,
        creator_name: user.email?.split("@")[0] || "مدیر ساختمان",
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category,
      },
      {
        onSuccess: () => {
          setOpenNew(false);
          setSubject("");
          setDescription("");
          setPriority("medium");
          setCategory("support");
        },
      }
    );
  };

  if (!isAdmin && !buildingId) {
    return <div className="text-center text-muted-foreground py-10">ابتدا یک ساختمان انتخاب کنید</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            {isAdmin ? "تیکت‌های پشتیبانی" : "ارتباط با پشتیبانی"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "مدیریت تیکت‌های دریافتی از مدیران ساختمان‌ها" : "ثبت درخواست و گفتگو با تیم پشتیبانی پلتفرم"}
          </p>
        </div>
        {!isAdmin && (
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                تیکت جدید
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-lg">
              <DialogHeader>
                <DialogTitle>ثبت تیکت جدید</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان *</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع درخواست" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>اولویت</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                          <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>دسته‌بندی</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                          <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>توضیحات *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="جزئیات درخواست خود را شرح دهید..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNew(false)}>انصراف</Button>
                <Button onClick={handleCreate} disabled={createTicket.isPending || !subject.trim() || !description.trim()}>
                  {createTicket.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  ثبت تیکت
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو..."
              className="pr-8"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tickets list */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <div>هیچ تیکتی یافت نشد</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((t) => (
            <TicketRow
              key={t.id}
              ticket={t}
              isAdmin={isAdmin}
              onOpen={() => setSelectedId(t.id)}
              onDelete={() => deleteTicket.mutate(t.id)}
              onChangeStatus={(status) => updateTicket.mutate({ id: t.id, updates: { status } })}
            />
          ))}
        </div>
      )}

      {/* Conversation dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent dir="rtl" className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
          {selectedTicket && (
            <TicketConversation
              ticket={selectedTicket}
              isAdmin={isAdmin}
              onClose={() => setSelectedId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketRow({
  ticket,
  isAdmin,
  onOpen,
  onDelete,
  onChangeStatus,
}: {
  ticket: SupportTicket;
  isAdmin: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onChangeStatus: (s: TicketStatus) => void;
}) {
  const otherSideRole = isAdmin ? "manager" : "super_admin";
  const hasNewReply = ticket.last_reply_by_role === otherSideRole && ticket.status !== "closed";

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/40",
        hasNewReply && "border-primary border-2"
      )}
      onClick={onOpen}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", priorityColor[ticket.priority])}>
            {ticket.priority === "urgent" ? <AlertCircle className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{ticket.subject}</span>
              {hasNewReply && <Badge className="h-5 text-[10px]">جدید</Badge>}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{ticket.description}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
              <Badge variant="outline" className={cn("h-5", priorityColor[ticket.priority])}>
                {PRIORITY_LABELS[ticket.priority]}
              </Badge>
              <Badge variant="outline" className={cn("h-5", statusColor[ticket.status])}>
                {STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline" className="h-5">{CATEGORY_LABELS[ticket.category]}</Badge>
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(parseISO(ticket.last_reply_at), "d MMM HH:mm", { locale: faIR })}
              </span>
              {isAdmin && <span className="text-muted-foreground">• {ticket.creator_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isAdmin && (
              <Select value={ticket.status} onValueChange={(v) => onChangeStatus(v as TicketStatus)}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {ticket.status === "closed" && <CheckCircle2 className="w-4 h-4 text-success" />}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("حذف تیکت؟")) onDelete();
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
