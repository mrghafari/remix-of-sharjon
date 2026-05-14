import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, MessageSquare, Tag } from "lucide-react";
import { PaymentGatewaySettings } from "./PaymentGatewaySettings";
import { SmsSettings } from "./SmsSettings";
import { AdminPricingSettings } from "./AdminPricingSettings";

interface Props {
  /** When provided, shows per-customer settings; otherwise platform-wide */
  userId?: string;
}

export function AdminPlatformSettings({ userId }: Props) {
  return (
    <div className="space-y-4">
      {!userId && (
        <div className="bg-muted/50 border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            این تنظیمات به‌عنوان <strong className="text-foreground">پیش‌فرض سراسری</strong> برای
            همه مشتریان پلتفرم اعمال می‌شود. در صفحه ویرایش هر مشتری می‌توانید تنظیمات اختصاصی
            متفاوتی تعریف کنید.
          </p>
        </div>
      )}

      <Tabs defaultValue="payment" dir="rtl">
        <TabsList>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            درگاه پرداخت
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            سرویس پیامک
          </TabsTrigger>
          {!userId && (
            <TabsTrigger value="pricing" className="gap-2">
              <Tag className="h-4 w-4" />
              تعرفه‌ها
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="payment" className="mt-4">
          <PaymentGatewaySettings userId={userId} />
        </TabsContent>

        <TabsContent value="sms" className="mt-4">
          <SmsSettings userId={userId} />
        </TabsContent>

        {!userId && (
          <TabsContent value="pricing" className="mt-4">
            <AdminPricingSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
