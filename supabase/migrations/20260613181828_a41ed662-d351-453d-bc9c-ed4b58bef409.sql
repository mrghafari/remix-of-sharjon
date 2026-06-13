
-- Online meetings table
CREATE TABLE public.building_online_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  room_name text NOT NULL,
  jitsi_domain text NOT NULL DEFAULT 'meet.jit.si',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_online_meetings TO authenticated;
GRANT ALL ON public.building_online_meetings TO service_role;

ALTER TABLE public.building_online_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view online meetings"
  ON public.building_online_meetings FOR SELECT
  TO authenticated
  USING (
    public.is_building_member(auth.uid(), building_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Managers can insert online meetings"
  ON public.building_online_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_building_manager(auth.uid(), building_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Managers can update online meetings"
  ON public.building_online_meetings FOR UPDATE
  TO authenticated
  USING (
    public.is_building_manager(auth.uid(), building_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Managers can delete online meetings"
  ON public.building_online_meetings FOR DELETE
  TO authenticated
  USING (
    public.is_building_manager(auth.uid(), building_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER trg_online_meetings_updated_at
  BEFORE UPDATE ON public.building_online_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_online_meetings_building ON public.building_online_meetings(building_id, scheduled_at DESC);

-- Update default SMS template generator to add online meeting invite
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
مدیریت ساختمان {ساختمان}');

  INSERT INTO public.sms_settings (building_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;
