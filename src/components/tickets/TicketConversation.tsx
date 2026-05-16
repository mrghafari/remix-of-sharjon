import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTicketMessages, useSendTicketMessage, useMarkTicketRead, PRIORITY_LABELS, STATUS_LABELS, CATEGORY_LABELS, type SupportTicket } from "@/hooks/useSupportTickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Paperclip, X, Loader2, ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  ticket: SupportTicket;
  isAdmin: boolean;
  onClose: () => void;
}

export function TicketConversation({ ticket, isAdmin, onClose }: Props) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useTicketMessages(ticket.id);
  const send = useSendTicketMessage();
  const markRead = useMarkTicketRead();

  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    markRead.mutate({ ticketId: ticket.id, isAdmin });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, isAdmin, messages.length]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("حجم فایل باید کمتر از ۵ مگابایت باشد");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) setFilePreview(URL.createObjectURL(f));
    else setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearFile = () => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  };

  const upload = async (): Promise<string | null> => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${ticket.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("ticket-attachments").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      toast.error("آپلود ناموفق بود: " + error.message);
      return null;
    }
    return supabase.storage.from("ticket-attachments").getPublicUrl(path).data.publicUrl;
  };

  const handleSend = async () => {
    if ((!content.trim() && !file) || !user) return;
    let attachment_url: string | null = null;
    if (file) {
      setUploading(true);
      attachment_url = await upload();
      setUploading(false);
      if (!attachment_url) return;
    }
    send.mutate(
      {
        ticket_id: ticket.id,
        building_id: ticket.building_id,
        sender_user_id: user.id,
        sender_name: isAdmin ? "پشتیبانی پلتفرم" : ticket.creator_name,
        sender_role: isAdmin ? "super_admin" : "manager",
        content: content.trim() || (attachment_url ? "📎 پیوست" : ""),
        attachment_url,
      },
      {
        onSuccess: () => {
          setContent("");
          clearFile();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isImage = (url: string) => /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url);

  return (
    <>
      <DialogHeader className="px-4 py-3 border-b shrink-0 bg-card">
        <DialogTitle className="flex items-center gap-2 flex-wrap">
          <span>{ticket.subject}</span>
          <Badge variant="outline" className="text-[10px]">{PRIORITY_LABELS[ticket.priority]}</Badge>
          <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[ticket.status]}</Badge>
          <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[ticket.category]}</Badge>
        </DialogTitle>
        <p className="text-xs text-muted-foreground text-right">{ticket.description}</p>
      </DialogHeader>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">هنوز پیامی ارسال نشده. اولین پیام را بفرستید.</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_user_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[78%] px-3 py-2 rounded-lg shadow-sm text-sm",
                    mine ? "bg-success/20 rounded-tl-sm" : "bg-card rounded-tr-sm"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-primary">{m.sender_name}</span>
                    {m.sender_role === "super_admin" && (
                      <Badge variant="outline" className="h-4 text-[9px] px-1">پشتیبانی</Badge>
                    )}
                  </div>
                  {m.attachment_url && (
                    isImage(m.attachment_url) ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(m.attachment_url!)}
                        className="block mb-1 -mx-1 rounded-md overflow-hidden hover:opacity-90"
                      >
                        <img src={m.attachment_url} alt="پیوست" className="max-h-64 max-w-full object-contain" loading="lazy" />
                      </button>
                    ) : (
                      <a
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline mb-1"
                      >
                        <Paperclip className="w-3 h-3" /> دانلود پیوست
                      </a>
                    )
                  )}
                  {m.content && m.content !== "📎 پیوست" && (
                    <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground text-end mt-0.5">
                    {format(parseISO(m.created_at), "HH:mm - d MMM", { locale: faIR })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* File preview */}
      {file && (
        <div className="bg-card border-t px-3 py-2 flex items-center gap-3 shrink-0">
          {filePreview ? (
            <img src={filePreview} alt="" className="h-14 w-14 object-cover rounded-md border" />
          ) : (
            <div className="h-14 w-14 rounded-md border flex items-center justify-center bg-muted">
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 text-xs">
            <div className="font-semibold truncate">{file.name}</div>
            <div className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearFile}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="bg-card border-t p-2 flex items-end gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handlePickFile}
        />
        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="w-4 h-4" />
        </Button>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="پیام خود را بنویسید..."
          rows={1}
          className="resize-none min-h-[36px] max-h-32"
          disabled={ticket.status === "closed"}
        />
        <Button
          onClick={handleSend}
          disabled={(!content.trim() && !file) || send.isPending || uploading || ticket.status === "closed"}
          className="h-9 w-9 rounded-full p-0 shrink-0"
        >
          {uploading || send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {ticket.status === "closed" && (
        <div className="bg-muted text-center text-xs text-muted-foreground py-2 border-t">
          این تیکت بسته شده است
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
          <Button size="icon" variant="ghost" className="absolute top-4 left-4 text-white hover:bg-white/20">
            <X className="w-6 h-6" />
          </Button>
        </div>
      )}
    </>
  );
}
