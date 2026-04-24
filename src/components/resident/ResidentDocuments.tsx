import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Folder, Loader2, Lock } from "lucide-react";
import { useResidentUnit } from "@/hooks/useResidentUnit";

interface Props {
  buildingId: string;
}

export function ResidentDocuments({ buildingId }: Props) {
  const { currentUnitId } = useResidentUnit();

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
    enabled: !isBlocked,
  });

  const handleDownload = async (filePath: string, fileName: string) => {
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

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p>سندی ثبت نشده است</p>
        </CardContent>
      </Card>
    );
  }

  // Group by folder
  const folders = documents.reduce((acc, doc) => {
    const folder = doc.folder || "عمومی";
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  return (
    <div className="space-y-4">
      {Object.entries(folders).map(([folder, docs]) => (
        <Card key={folder}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Folder className="w-4 h-4" />
              {folder}
              <span className="text-xs text-muted-foreground">({docs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{doc.file_name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(doc.file_path, doc.file_name)}
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
