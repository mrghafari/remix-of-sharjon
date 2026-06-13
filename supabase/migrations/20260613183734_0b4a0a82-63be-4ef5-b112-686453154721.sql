
-- Signatures table
CREATE TABLE public.meeting_minute_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_minute_id uuid NOT NULL REFERENCES public.building_meeting_minutes(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  person_name text,
  person_role text,
  person_phone text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_minute_id, user_id)
);

CREATE INDEX idx_mms_minute ON public.meeting_minute_signatures(meeting_minute_id);
CREATE INDEX idx_mms_building ON public.meeting_minute_signatures(building_id);

GRANT SELECT, INSERT, DELETE ON public.meeting_minute_signatures TO authenticated;
GRANT ALL ON public.meeting_minute_signatures TO service_role;

ALTER TABLE public.meeting_minute_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view signatures in their building"
ON public.meeting_minute_signatures FOR SELECT TO authenticated
USING (public.is_building_member(auth.uid(), building_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Members can sign as themselves"
ON public.meeting_minute_signatures FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_building_member(auth.uid(), building_id)
);

CREATE POLICY "Signers can delete own signature"
ON public.meeting_minute_signatures FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Managers can delete signatures"
ON public.meeting_minute_signatures FOR DELETE TO authenticated
USING (public.is_building_manager(auth.uid(), building_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Update default SMS templates to include sign invite
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
مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'online_meeting_invite', 'دعوت به جلسه آنلاین', 'سلام {نام}،
جلسه آنلاین «{عنوان}» در تاریخ {تاریخ} ساعت {ساعت} برگزار می‌شود.
لینک ورود: {لینک}
مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'meeting_minute_sign_invite', 'دعوت به امضای صورتجلسه', 'سلام {نام}،
صورتجلسه «{عنوان}» در تاریخ {تاریخ} ثبت شد.
لطفاً پس از مطالعه، نسبت به امضای الکترونیکی آن در سامانه اقدام فرمایید.
مدیریت ساختمان {ساختمان}');

  INSERT INTO public.sms_settings (building_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

-- Seed template for existing buildings
INSERT INTO public.sms_templates (building_id, template_key, title, body)
SELECT b.id, 'meeting_minute_sign_invite', 'دعوت به امضای صورتجلسه',
'سلام {نام}،
صورتجلسه «{عنوان}» در تاریخ {تاریخ} ثبت شد.
لطفاً پس از مطالعه، نسبت به امضای الکترونیکی آن در سامانه اقدام فرمایید.
مدیریت ساختمان {ساختمان}'
FROM public.buildings b
WHERE NOT EXISTS (
  SELECT 1 FROM public.sms_templates t
  WHERE t.building_id = b.id AND t.template_key = 'meeting_minute_sign_invite'
);
