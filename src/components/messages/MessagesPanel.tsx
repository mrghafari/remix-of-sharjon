import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Trash2, MessageSquare, Loader2, CornerUpLeft, Check, CheckCheck, X, Search, Image as ImageIcon, Paperclip } from "lucide-react";
import { useMessages, useSendMessage, useMarkMessageRead, useDeleteMessage, type BuildingMessage } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, isToday, isYesterday } from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { cn } from "@/lib/utils";

interface MessagesPanelProps {
  buildingId: string;
  residentMode?: boolean;
  unitId?: string | null;
  senderName: string;
  senderRole: string;
}

// Tail SVG for chat bubbles (WhatsApp-like)
const BubbleTail = ({ side }: { side: "left" | "right" }) => (
  <svg
    viewBox="0 0 8 13"
    width="8"
    height="13"
    className={cn(
      "absolute bottom-0 fill-current",
      side === "right" ? "-left-[7px]" : "-right-[7px] scale-x-[-1]"
    )}
    aria-hidden="true"
  >
    <path d="M5.188 1.001C2.9 4.97.624 8.5.027 11.502c-.165.829.354 1.5 1.198 1.5h6.775V0L5.188 1.001z" />
  </svg>
);

const formatDay = (iso: string) => {
  const d = parseISO(iso);
  if (isToday(d)) return "امروز";
  if (isYesterday(d)) return "دیروز";
  return format(d, "d MMMM yyyy", { locale: faIR });
};

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
  const [showSubject, setShowSubject] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort ascending (oldest top, newest bottom) — chat style
  const sorted = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q) ||
        (m.subject || "").toLowerCase().includes(q)
    );
  }, [sorted, search]);

  // Group by day for date separators
  const grouped = useMemo(() => {
    const out: { dayKey: string; dayLabel: string; items: BuildingMessage[] }[] = [];
    filtered.forEach((m) => {
      const dayKey = m.created_at.slice(0, 10);
      const last = out[out.length - 1];
      if (last && last.dayKey === dayKey) last.items.push(m);
      else out.push({ dayKey, dayLabel: formatDay(m.created_at), items: [m] });
    });
    return out;
  }, [filtered]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length]);

  // Find parent message helper for reply preview inside a bubble
  const findParent = (id: string | null) => (id ? messages.find((m) => m.id === id) : null);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("فقط فایل تصویری مجاز است");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("حجم تصویر باید کمتر از ۵ مگابایت باشد");
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${buildingId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("message-images").upload(path, imageFile, {
      contentType: imageFile.type,
      upsert: false,
    });
    if (error) {
      toast.error("آپلود تصویر ناموفق بود: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("message-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSend = async () => {
    if ((!content.trim() && !imageFile) || !user) return;
    let image_url: string | null = null;
    if (imageFile) {
      setUploading(true);
      image_url = await uploadImage();
      setUploading(false);
      if (!image_url) return;
    }
    sendMessage.mutate(
      {
        building_id: buildingId,
        sender_user_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        recipient_user_id: replyTo ? replyTo.sender_user_id : null,
        unit_id: unitId || null,
        subject: replyTo ? null : (subject.trim() || null),
        content: content.trim() || (image_url ? "📷 تصویر" : ""),
        parent_id: replyTo?.id || null,
        image_url,
      },
      {
        onSuccess: () => {
          setContent("");
          setSubject("");
          setShowSubject(false);
          setReplyTo(null);
          clearImage();
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

  const isUnread = (m: BuildingMessage) =>
    !m.is_read && m.sender_user_id !== user?.id && (m.recipient_user_id === user?.id || m.recipient_user_id === null);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] bg-muted/30 rounded-lg border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-primary-foreground/15 flex items-center justify-center">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">گفتگوی ساختمان</div>
          <div className="text-[11px] opacity-80">
            {residentMode ? "ارتباط مستقیم با مدیریت" : "گفتگو با ساکنین"}
          </div>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو..."
            className="h-8 w-40 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 pr-7 text-xs"
          />
        </div>
      </div>

      {/* Messages area with WhatsApp-like patterned background */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2 py-10">
            <MessageSquare className="w-10 h-10 opacity-30" />
            <div className="text-sm">هنوز پیامی وجود ندارد</div>
            <div className="text-xs">اولین پیام را ارسال کنید</div>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.dayKey} className="space-y-1.5">
              {/* Date separator */}
              <div className="flex justify-center my-2 sticky top-0 z-10">
                <span className="bg-background/80 backdrop-blur text-[11px] px-2.5 py-1 rounded-full shadow-sm border text-muted-foreground">
                  {group.dayLabel}
                </span>
              </div>
              {group.items.map((m, idx) => {
                const unread = isUnread(m);
                // "mine" detection: match by user_id OR by sender_name+role (residents share auth user but have distinct names)
                const mine =
                  (m.sender_user_id === user?.id && m.sender_name === senderName) ||
                  (m.sender_name === senderName && m.sender_role === senderRole);
                const prev = group.items[idx - 1];
                const sameSenderAsPrev =
                  prev &&
                  prev.sender_name === m.sender_name &&
                  prev.sender_role === m.sender_role;
                const parent = findParent(m.parent_id);

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex w-full group",
                      mine ? "justify-end" : "justify-start",
                      sameSenderAsPrev ? "mt-0.5" : "mt-2"
                    )}
                    onClick={() => unread && markRead.mutate(m.id)}
                  >
                    <div
                      className={cn(
                        "relative max-w-[78%] sm:max-w-[65%] px-2.5 py-1.5 rounded-lg shadow-sm text-sm cursor-pointer transition-all",
                        mine
                          ? "bg-success/20 text-foreground rounded-tr-sm"
                          : "bg-card text-foreground rounded-tl-sm",
                        !sameSenderAsPrev && (mine ? "rounded-tr-lg" : "rounded-tl-lg")
                      )}
                    >
                      {/* Tail only on first bubble of a sender group */}
                      {!sameSenderAsPrev && (
                        <span className={cn(mine ? "text-success/20" : "text-card")}>
                          <BubbleTail side={mine ? "right" : "left"} />
                        </span>
                      )}

                      {/* Sender name (only for others, only first in group) */}
                      {!mine && !sameSenderAsPrev && (
                        <div className="text-[11px] font-semibold text-primary mb-0.5">
                          {m.sender_name}
                          {m.sender_role === "manager" && (
                            <Badge variant="outline" className="mr-1 h-3.5 text-[9px] px-1">مدیر</Badge>
                          )}
                        </div>
                      )}

                      {/* Reply preview inside bubble */}
                      {parent && (
                        <div className={cn(
                          "border-r-2 pr-2 mb-1 text-[11px] rounded bg-foreground/5 py-1 px-1.5",
                          mine ? "border-success" : "border-primary"
                        )}>
                          <div className="font-semibold opacity-80">{parent.sender_name}</div>
                          <div className="opacity-70 line-clamp-2">{parent.content}</div>
                        </div>
                      )}

                      {m.subject && (
                        <div className="text-[12px] font-bold mb-0.5">{m.subject}</div>
                      )}

                      {m.image_url && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLightbox(m.image_url!); }}
                          className="block mb-1 -mx-1 rounded-md overflow-hidden bg-muted/30 hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={m.image_url}
                            alt="پیوست تصویر"
                            className="max-h-64 max-w-full object-contain"
                            loading="lazy"
                          />
                        </button>
                      )}

                      {m.content && m.content !== "📷 تصویر" && (
                        <div className="whitespace-pre-wrap break-words leading-relaxed pr-1">
                          {m.content}
                        </div>
                      )}

                      {/* Footer: time + status + actions */}
                      <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                        {unread && (
                          <Badge className="h-3.5 text-[9px] px-1 ml-1">جدید</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(m.created_at), "HH:mm", { locale: faIR })}
                        </span>
                        {mine && (
                          m.is_read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-muted-foreground" />
                          )
                        )}
                      </div>

                      {/* Hover actions */}
                      <div
                        className={cn(
                          "absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-background border rounded-full shadow-md p-0.5",
                          mine ? "left-0" : "right-0"
                        )}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyTo(m);
                          }}
                          title="پاسخ"
                        >
                          <CornerUpLeft className="w-3 h-3" />
                        </Button>
                        {(mine || !residentMode) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage.mutate(m.id);
                            }}
                            title="حذف"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="bg-card border-t px-3 py-2 flex items-center gap-2">
          <div className="w-1 self-stretch bg-primary rounded" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-primary">پاسخ به {replyTo.sender_name}</div>
            <div className="text-xs text-muted-foreground truncate">{replyTo.content}</div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setReplyTo(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Subject input (collapsible) */}
      {showSubject && !replyTo && !residentMode && (
        <div className="bg-card border-t px-3 py-2">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="موضوع (اختیاری)"
            className="h-8 text-xs"
          />
        </div>
      )}

      {/* Image preview before sending */}
      {imagePreview && (
        <div className="bg-card border-t px-3 py-2 flex items-center gap-3">
          <div className="relative">
            <img src={imagePreview} alt="پیش‌نمایش" className="h-16 w-16 object-cover rounded-md border" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center shadow"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">{imageFile?.name}</div>
            <div>{((imageFile?.size || 0) / 1024).toFixed(0)} KB</div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="bg-card border-t p-2 flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePickImage}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={() => fileInputRef.current?.click()}
          title="ارسال تصویر"
          disabled={uploading || sendMessage.isPending}
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
        {!residentMode && !replyTo && (
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full shrink-0"
            onClick={() => setShowSubject((s) => !s)}
            title="افزودن موضوع"
          >
            <span className="text-xs font-bold">#</span>
          </Button>
        )}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `پاسخ به ${replyTo.sender_name}...` : (residentMode ? "پیام به مدیریت..." : "پیامی بنویسید...")}
          rows={1}
          className="resize-none min-h-[40px] max-h-32 rounded-2xl bg-muted/50 border-muted text-sm py-2"
        />
        <Button
          onClick={handleSend}
          disabled={(!content.trim() && !imageFile) || sendMessage.isPending || uploading}
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
        >
          {(sendMessage.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Lightbox for viewing images full-size */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="نمایش کامل" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
          <button
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
