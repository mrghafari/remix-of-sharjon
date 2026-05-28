CREATE OR REPLACE FUNCTION public.create_default_sms_templates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.sms_templates (building_id, template_key, title, body) VALUES
    (NEW.id, 'debt_report', 'گزارش بدهی', 'سلام {نام}،
بدهی واحد {واحد} در ساختمان {ساختمان}: {مبلغ} ریال
لطفاً نسبت به پرداخت اقدام فرمایید.
سپاس'),
    (NEW.id, 'payment_thanks', 'تشکر پرداخت', 'سلام {نام}،
پرداخت {مبلغ} ریال برای واحد {واحد} با موفقیت ثبت شد.
مانده بدهی فعلی: {مانده} ریال
با تشکر - مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'reservation_approved', 'تأیید رزرو', 'سلام {نام}،
درخواست رزرو {مکان} برای تاریخ {تاریخ} ساعت {ساعت} تأیید شد.
مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'reservation_rejected', 'رد رزرو', 'سلام {نام}،
متأسفانه درخواست رزرو {مکان} برای تاریخ {تاریخ} رد شد.
{توضیحات}
مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'balance_reminder', 'یادآوری مانده', 'سلام {نام}،
یادآوری: مانده بدهی واحد {واحد} برابر {مانده} ریال است.
مدیریت ساختمان {ساختمان}');

  INSERT INTO public.sms_settings (building_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;