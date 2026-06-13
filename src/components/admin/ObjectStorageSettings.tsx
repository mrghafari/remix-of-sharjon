import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "object_storage_enabled";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HardDrive, Loader2, CheckCircle2, XCircle, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Object Storage (S3-compatible) settings — Liara bucket "sharjon".
 * Credentials are stored as Lovable Cloud secrets; this UI lets the admin
 * test the connection and try a sample upload through the `object-storage`
 * edge function. The "save settings" button is reserved for the next phase
 * (per-customer override of platform defaults).
 */
export function ObjectStorageSettings() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {}
  }, [enabled]);
  const [form, setForm] = useState({
    provider: "liara",
    endpoint: "storage.c2.liara.site",
    bucket: "sharjon",
    accessKey: "qcvp7at2c9p59v56",
    secretKey: "••••••••••••••••••••••••••••••••",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: true; message: string; sample?: string }
    | { ok: false; message: string; details?: string }
    | null
  >(null);

  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("object-storage", {
        body: { action: "test" },
      });
      if (error) throw error;
      if (data?.ok) {
        setTestResult({ ok: true, message: data.message, sample: data.sample });
        toast.success(data.message);
      } else {
        setTestResult({ ok: false, message: data?.message ?? "اتصال ناموفق", details: data?.details });
        toast.error(data?.message ?? "اتصال ناموفق");
      }
    } catch (e: any) {
      const msg = e?.message ?? "خطا در فراخوانی سرور";
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadedUrl(null);
    try {
      const key = `test-uploads/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.functions.invoke("object-storage", {
        body: { action: "sign-upload", key, contentType: file.type || "application/octet-stream" },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("URL امضا شده دریافت نشد");

      const putRes = await fetch(data.url, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        const text = await putRes.text();
        throw new Error(`آپلود ناموفق (HTTP ${putRes.status}): ${text.slice(0, 200)}`);
      }
      setUploadedUrl(data.publicUrl);
      toast.success("فایل با موفقیت در باکت لیارا آپلود شد");
    } catch (e: any) {
      toast.error(e?.message ?? "خطا در آپلود");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          فضای ذخیره‌سازی فایل‌ها (Object Storage)
        </CardTitle>
        <CardDescription>
          تنظیمات باکت ابری برای ذخیره اسناد، تصاویر و سایر فایل‌های آپلودی. کلیدها در Lovable Cloud به‌صورت امن نگه‌داری می‌شوند و در کد فرانت قرار نمی‌گیرند.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">استفاده از Object Storage</Label>
            <p className="text-xs text-muted-foreground">
              با فعال‌سازی، فایل‌های آپلودی در باکت S3 ذخیره می‌شوند. (در فاز فعلی فقط برای تست در دسترس است)
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>ارائه‌دهنده</Label>
            <Input disabled value={form.provider} onChange={(e) => update("provider", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>API Endpoint</Label>
            <Input disabled dir="ltr" value={form.endpoint} onChange={(e) => update("endpoint", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>نام باکت (Bucket)</Label>
            <Input disabled dir="ltr" value={form.bucket} onChange={(e) => update("bucket", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Access Key</Label>
            <Input disabled dir="ltr" value={form.accessKey} onChange={(e) => update("accessKey", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Secret Key</Label>
            <Input disabled dir="ltr" type="password" value={form.secretKey} onChange={(e) => update("secretKey", e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              برای تغییر کلیدها از تنظیمات Secrets در Lovable Cloud استفاده کنید.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <Button onClick={handleTest} disabled={testing} variant="secondary">
            {testing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : null}
            تست اتصال
          </Button>

          <Button onClick={handlePickFile} disabled={uploading} variant="outline">
            {uploading ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Upload className="h-4 w-4 ml-2" />}
            آپلود نمونه
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />

          <Button disabled className="ml-auto" title="در فاز بعدی فعال می‌شود">
            ذخیره تنظیمات
          </Button>
        </div>

        {testResult && (
          <div
            className={`rounded-md border p-3 text-sm flex items-start gap-2 ${
              testResult.ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <p className="font-medium">{testResult.message}</p>
              {"details" in testResult && testResult.details && (
                <pre className="text-[11px] bg-background/50 p-2 rounded overflow-auto max-h-40" dir="ltr">
                  {testResult.details}
                </pre>
              )}
            </div>
          </div>
        )}

        {uploadedUrl && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm space-y-1">
            <p className="font-medium">آپلود موفق</p>
            <a href={uploadedUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all" dir="ltr">
              {uploadedUrl}
            </a>
            <p className="text-[11px] text-muted-foreground">
              توجه: اگر باکت private باشد لینک مستقیم باز نمی‌شود و باید با Signed URL دانلود شود.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
