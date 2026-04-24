import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, MessageSquare, User, Loader2, CornerUpLeft } from "lucide-react";
import { useMessages, useSendMessage, useMarkMessageRead, useDeleteMessage, type BuildingMessage } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { cn } from "@/lib/utils";

interface MessagesPanelProps {
  buildingId: string;
  /** when true, render in resident mode (sends to managers / null recipient) */
  residentMode?: boolean;
  unitId?: string | null;
  senderName: string;
  /** "manager" | "resident" | "owner" */
  senderRole: string;
}

export function MessagesPanel({ buildingId, residentMode = false, unitId, senderName, senderRole }: MessagesPanelProps) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages(buildingId);
  const sendMessage = useSendMessage();
  const markRead = useMarkMessageRead();
  const deleteMessage = useDeleteMessage();

  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [replyTo, setReplyTo] = useState<BuildingMessage | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q) ||
        (m.subject || "").toLowerCase().includes(q)
    );
  }, [messages, search]);

  const handleSend = () => {
    if (!content.trim() || !user) return;
    sendMessage.mutate(
      {
        building_id: buildingId,
        sender_user_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        recipient_user_id: replyTo ? replyTo.sender_user_id : null,
        unit_id: unitId || null,
        subject: replyTo ? `پاسخ: ${replyTo.subject || replyTo.content.slice(0, 30)}` : subject.trim() || null,
        content: content.trim(),
        parent_id: replyTo?.id || null,
      },
      {
        onSuccess: () => {
          setContent("");
          setSubject("");
          setReplyTo(null);
        },
      }
    );
  };

  const isUnread = (m: BuildingMessage) =>
    !m.is_read && m.sender_user_id !== user?.id && (m.recipient_user_id === user?.id || m.recipient_user_id === null);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {replyTo ? (
                <span className="flex items-center gap-2">
                  پاسخ به {replyTo.sender_name}
                  <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)} className="h-6 text-xs">
                    لغو
                  </Button>
                </span>
              ) : (
                "ارسال پیام جدید"
              )}
            </span>
          </div>
          {!replyTo && !residentMode && (
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع (اختیاری)" />
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={residentMode ? "پیام خود را برای مدیر بنویسید..." : "پیام به ساکنین یا پاسخ..."}
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={!content.trim() || sendMessage.isPending} className="gap-2">
              {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ارسال
            </Button>
          </div>
        </CardContent>
      </Card>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در پیام‌ها..." />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">پیامی یافت نشد</CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pl-2">
            {filtered.map((m) => {
              const unread = isUnread(m);
              const mine = m.sender_user_id === user?.id;
              return (
                <div key={m.id} className={cn("flex w-full", mine ? "justify-start" : "justify-end")}>
                  <Card
                    className={cn(
                      "transition-all hover:shadow-md cursor-pointer max-w-[80%]",
                      mine ? "bg-success/5 border-success/30" : "bg-primary/5 border-primary/20",
                      unread && "border-primary/50 bg-primary/5"
                    )}
                    onClick={() => unread && markRead.mutate(m.id)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", mine ? "bg-success/20" : "bg-primary/20")}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              {m.sender_name}
                              {unread && <Badge className="h-4 text-[10px]">جدید</Badge>}
                              {mine && <Badge variant="outline" className="h-4 text-[10px]">شما</Badge>}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {format(parseISO(m.created_at), "d MMMM yyyy • HH:mm", { locale: faIR })}
                              {m.recipient_user_id ? " • مستقیم" : " • عمومی"}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyTo(m);
                            }}
                            title="پاسخ"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                            پاسخ
                          </Button>
                          {(mine || !residentMode) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessage.mutate(m.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {m.subject && <div className="text-sm font-semibold">{m.subject}</div>}
                      <div className="text-sm whitespace-pre-wrap text-foreground/90">{m.content}</div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
