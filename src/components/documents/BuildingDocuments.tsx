import { useState, useCallback, useEffect } from "react";
import { useBuilding } from "@/contexts/BuildingContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderOpen, Upload, Trash2, FileText, Image, Plus, FolderPlus, ArrowRight, Download, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocRow {
  id: string;
  building_id: string;
  folder: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DEFAULT_FOLDERS = ["عمومی", "قراردادها", "صورتجلسات", "نقشه‌ها", "مالی"];

export function BuildingDocuments() {
  const { currentBuildingId } = useBuilding();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeFolder, setActiveFolderState] = useState<string | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocRow | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);

  // Persist custom folders per building in localStorage
  const customFoldersKey = currentBuildingId ? `custom-folders:${currentBuildingId}` : null;
  useEffect(() => {
    if (!customFoldersKey) return;
    try {
      const raw = localStorage.getItem(customFoldersKey);
      setCustomFolders(raw ? JSON.parse(raw) : []);
    } catch {
      setCustomFolders([]);
    }
  }, [customFoldersKey]);
  useEffect(() => {
    if (!customFoldersKey) return;
    try {
      localStorage.setItem(customFoldersKey, JSON.stringify(customFolders));
    } catch {}
  }, [customFolders, customFoldersKey]);

  const setActiveFolder = (name: string | null) => {
    if (name) {
      window.history.pushState({ folder: name }, "", `#documents/${encodeURIComponent(name)}`);
      setActiveFolderState(name);
    } else if (window.location.hash.startsWith("#documents/")) {
      window.history.back();
    } else {
      setActiveFolderState(null);
    }
  };

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#documents/")) {
        setActiveFolderState(decodeURIComponent(hash.replace("#documents/", "")) || null);
      } else {
        setActiveFolderState(null);
      }
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["building-documents", currentBuildingId],
    queryFn: async () => {
      if (!currentBuildingId) return [];
      const { data, error } = await supabase
        .from("building_documents")
        .select("*")
        .eq("building_id", currentBuildingId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data as DocRow[]) || [];
    },
    enabled: !!currentBuildingId,
  });

  // Get unique folders
  const folders = Array.from(
    new Set([...DEFAULT_FOLDERS, ...customFolders, ...documents.map((d) => d.folder)])
  );

  const folderDocs = activeFolder
    ? documents.filter((d) => d.folder === activeFolder)
    : [];

  // Upload mutation
  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !currentBuildingId || !activeFolder) return;

      const invalidFiles: string[] = [];
      const validFiles: File[] = [];

      Array.from(files).forEach((f) => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
          invalidFiles.push(`${f.name} (فرمت غیرمجاز)`);
        } else if (f.size > MAX_FILE_SIZE) {
          invalidFiles.push(`${f.name} (بیش از ۱۰ مگابایت)`);
        } else {
          validFiles.push(f);
        }
      });

      if (invalidFiles.length) {
        toast({
          title: "فایل‌های نامعتبر",
          description: invalidFiles.join("، "),
          variant: "destructive",
        });
      }

      if (!validFiles.length) return;

      setUploading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        for (const file of validFiles) {
          const ext = file.name.split(".").pop();
          const path = `${currentBuildingId}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("building-documents")
            .upload(path, file);
          if (uploadError) throw uploadError;

          const { error: insertError } = await supabase
            .from("building_documents")
            .insert({
              building_id: currentBuildingId,
              folder: activeFolder,
              file_name: file.name,
              file_path: path,
              file_size: file.size,
              file_type: file.type,
              uploaded_by: user.id,
            } as any);
          if (insertError) throw insertError;
        }

        queryClient.invalidateQueries({ queryKey: ["building-documents", currentBuildingId] });
        toast({ title: "آپلود موفق", description: `${validFiles.length} فایل آپلود شد` });
      } catch (err: any) {
        toast({ title: "خطا در آپلود", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [currentBuildingId, activeFolder, queryClient, toast]
  );

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: DocRow) => {
      await supabase.storage.from("building-documents").remove([doc.file_path]);
      const { error } = await supabase.from("building_documents").delete().eq("id", doc.id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-documents", currentBuildingId] });
      toast({ title: "فایل حذف شد" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "خطا در حذف", description: err.message, variant: "destructive" });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      const folderFiles = documents.filter((d) => d.folder === folderName);
      if (folderFiles.length > 0) {
        const paths = folderFiles.map((d) => d.file_path);
        await supabase.storage.from("building-documents").remove(paths);
        for (const doc of folderFiles) {
          const { error } = await supabase.from("building_documents").delete().eq("id", doc.id) as any;
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-documents", currentBuildingId] });
      if (deleteFolderTarget) {
        setCustomFolders((prev) => prev.filter((f) => f !== deleteFolderTarget));
      }
      if (activeFolder === deleteFolderTarget) setActiveFolder(null);
      toast({ title: "پوشه حذف شد" });
      setDeleteFolderTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "خطا در حذف پوشه", description: err.message, variant: "destructive" });
      setDeleteFolderTarget(null);
    },
  });

  // Download
  const handleDownload = async (doc: DocRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("building-documents")
        .download(doc.file_path);
      if (error || !data) {
        toast({ title: "خطا در دانلود", variant: "destructive" });
        return;
      }
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "خطا در دانلود", variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.includes(name)) {
      toast({ title: "این پوشه قبلاً وجود دارد", variant: "destructive" });
      return;
    }
    setCustomFolders((prev) => [...prev, name]);
    setActiveFolder(name);
    setNewFolderDialog(false);
    setNewFolderName("");
  };

  if (!currentBuildingId) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          اسناد ساختمان
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setNewFolderDialog(true)}>
          <FolderPlus className="w-4 h-4 ml-1" />
          پوشه جدید
        </Button>
      </CardHeader>
      <CardContent>
        {/* Breadcrumb */}
        {activeFolder && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <button
              onClick={() => setActiveFolder(null)}
              className="hover:text-foreground transition-colors"
            >
              پوشه‌ها
            </button>
            <ArrowRight className="w-3 h-3 rotate-180" />
            <span className="text-foreground font-medium">{activeFolder}</span>
          </div>
        )}

        {/* Folder grid */}
        {!activeFolder && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map((folder) => {
              const count = documents.filter((d) => d.folder === folder).length;
              const isDefault = DEFAULT_FOLDERS.includes(folder);
              const canDelete = !isDefault || count === 0;
              return (
                <div key={folder} className="relative group">
                  <button
                    onClick={() => setActiveFolder(folder)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border w-full",
                      "hover:bg-accent/50 hover:border-primary/30 transition-all duration-200",
                      "cursor-pointer"
                    )}
                  >
                    <FolderOpen className="w-10 h-10 text-amber-500 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-center leading-tight">{folder}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {count} فایل
                      </Badge>
                    )}
                  </button>
                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 left-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteFolderTarget(folder);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Files in folder */}
        {activeFolder && (
          <div className="space-y-3">
            {/* Upload area */}
            <label
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed",
                "cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all",
                uploading && "pointer-events-none opacity-60"
              )}
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "در حال آپلود..." : "فایل عکس یا PDF را اینجا بکشید یا کلیک کنید"}
              </span>
              <input
                type="file"
                className="hidden"
                multiple
                accept={ACCEPTED_TYPES.join(",")}
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
              />
            </label>

            {/* File list */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : folderDocs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                هنوز فایلی در این پوشه آپلود نشده است
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {folderDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors"
                  >
                    {doc.file_type.startsWith("image/") ? (
                      <Image className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(doc.file_size)} •{" "}
                        {new Date(doc.uploaded_at).toLocaleDateString("fa-IR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(doc)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* New folder dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ایجاد پوشه جدید</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="نام پوشه"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              <Plus className="w-4 h-4 ml-1" />
              ایجاد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف فایل</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.file_name}» اطمینان دارید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete folder confirmation */}
      <AlertDialog open={!!deleteFolderTarget} onOpenChange={() => setDeleteFolderTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پوشه</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const count = documents.filter((d) => d.folder === deleteFolderTarget).length;
                return count > 0
                  ? `آیا از حذف پوشه «${deleteFolderTarget}» و ${count} فایل داخل آن اطمینان دارید؟`
                  : `آیا از حذف پوشه «${deleteFolderTarget}» اطمینان دارید؟`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFolderTarget && deleteFolderMutation.mutate(deleteFolderTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف پوشه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
