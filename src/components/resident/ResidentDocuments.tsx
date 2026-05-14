import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Folder, Loader2, Lock, ArrowRight } from "lucide-react";
import { useResidentUnit } from "@/hooks/useResidentUnit";

interface Props {
  buildingId: string;
}

const DEFAULT_FOLDERS = ["عمومی", "قراردادها", "صورتجلسات", "نقشه‌ها", "مالی"];

export function ResidentDocuments({ buildingId }: Props) {
  const { currentUnitId } = useResidentUnit();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);

  // Read custom folders saved by manager (best-effort; resident usually has none)
  useEffect(() => {
    if (!buildingId) return;
    try {
      const raw = localStorage.getItem(`custom-folders:${buildingId}`);
      setCustomFolders(raw ? JSON.parse(raw) : []);
    } catch {
      setCustomFolders([]);
    }
  }, [buildingId]);

  const { data: isBlocked, isLoading: checkingAccess } = useQuery({
    queryKey: ["unit_doc_access_check", buildingId, currentUnitId],
    queryFn: async () => {
      if (!currentUnitId) return false;
      const { data, error } = await supabase
        .from("unit_document_access_blocks" as any)
        .select("id")
        .eq("building_id", buildingId)
        .eq("unit_id", currentUnitId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!buildingId && !!currentUnitId,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["resident_documents", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_documents")
        .select("*")
        .eq("building_id", buildingId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!buildingId && !isBlocked,
  });

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from("building-documents").createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  if (checkingAccess || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Lock className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium text-foreground">دسترسی شما به اسناد ساختمان غیرفعال است</p>
          <p className="text-sm mt-1">برای فعال‌سازی با مدیر ساختمان تماس بگیرید.</p>
        </CardContent>
      </Card>
    );
  }

  // Build folder list: defaults + custom (manager localStorage) + folders inferred from docs
  const folders = Array.from(
    new Set([...DEFAULT_FOLDERS, ...customFolders, ...documents.map((d: any) => d.folder)])
  );

  // Folder detail view
  if (activeFolder) {
    const folderDocs = documents.filter((d: any) => d.folder === activeFolder);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Folder className="w-4 h-4" />
            {activeFolder}
            <span className="text-xs text-muted-foreground">({folderDocs.length})</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setActiveFolder(null)} className="gap-1">
            <ArrowRight className="w-4 h-4" />
            بازگشت
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {folderDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">سندی در این پوشه ثبت نشده است</p>
            </div>
          ) : (
            folderDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{doc.file_name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(doc.file_path)}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  // Folders grid
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {folders.map((folder) => {
        const count = documents.filter((d: any) => d.folder === folder).length;
        return (
          <button
            key={folder}
            onClick={() => setActiveFolder(folder)}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/40 transition-colors"
          >
            <Folder className="w-8 h-8 text-primary" />
            <span className="text-sm font-medium text-center leading-tight">{folder}</span>
            <span className="text-xs text-muted-foreground">{count} فایل</span>
          </button>
        );
      })}
    </div>
  );
}
