import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HardDrive } from "lucide-react";

/**
 * Object Storage (S3-compatible) settings.
 * UI only — the save button is intentionally disabled until backend integration is wired.
 * Values shown are the customer's Liara bucket credentials as provided.
 */
export function ObjectStorageSettings() {
  const [form, setForm] = useState({
    provider: "liara",
    endpoint: "storage.c2.liara.site",
    bucket: "sharjon",
    accessKey: "qcvp7at2c9p59v56",
    secretKey: "7dc69a1b-dcec-4a4d-84a0-00df197e4463",
  });

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          فضای ذخیره‌سازی فایل‌ها (Object Storage)
        </CardTitle>
        <CardDescription>
          تنظیمات باکت ابری برای ذخیره اسناد، تصاویر و سایر فایل‌های آپلودی. این تنظیمات روی همه باکت‌های فعلی (اسناد ساختمان، پیوست هزینه‌ها، تصاویر پیام‌ها، صورتجلسات و پیوست تیکت‌ها) اعمال خواهد شد.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>ارائه‌دهنده</Label>
            <Input value={form.provider} onChange={(e) => update("provider", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>API Endpoint</Label>
            <Input dir="ltr" value={form.endpoint} onChange={(e) => update("endpoint", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>نام باکت (Bucket)</Label>
            <Input dir="ltr" value={form.bucket} onChange={(e) => update("bucket", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Access Key</Label>
            <Input dir="ltr" value={form.accessKey} onChange={(e) => update("accessKey", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Secret Key</Label>
            <Input dir="ltr" type="password" value={form.secretKey} onChange={(e) => update("secretKey", e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            اتصال به این سرویس هنوز فعال نشده است. پس از تأیید نهایی، دکمه ذخیره فعال می‌شود.
          </p>
          <Button disabled title="به‌زودی فعال می‌شود">
            ذخیره تنظیمات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
