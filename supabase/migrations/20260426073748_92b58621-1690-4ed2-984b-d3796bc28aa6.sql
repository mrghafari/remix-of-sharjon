
-- ============================================
-- SMS Settings Table (per building)
-- ============================================
CREATE TABLE public.sms_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL UNIQUE,
  
  -- Provider config
  active_provider text NOT NULL DEFAULT 'kavenegar', -- 'kavenegar' | 'smsir' | 'melipayamak'
  kavenegar_api_key text,
  kavenegar_sender text,
  smsir_api_key text,
  smsir_sender text,
  melipayamak_username text,
  melipayamak_password text,
  melipayamak_sender text,
  is_enabled boolean NOT NULL DEFAULT false,
  
  -- Default recipients per event type
  -- 'owner' | 'resident' | 'both'
  debt_report_recipient text NOT NULL DEFAULT 'both',
  payment_thanks_recipient text NOT NULL DEFAULT 'resident',
  reservation_recipient text NOT NULL DEFAULT 'resident',
  balance_reminder_recipient text NOT NULL DEFAULT 'both',
  
  -- Event toggles
  debt_report_enabled boolean NOT NULL DEFAULT true,
  payment_thanks_enabled boolean NOT NULL DEFAULT true,
  reservation_enabled boolean NOT NULL DEFAULT true,
  balance_reminder_enabled boolean NOT NULL DEFAULT true,
  
  -- Auto schedule for debt report
  debt_auto_schedule_enabled boolean NOT NULL DEFAULT false,
  debt_auto_schedule_day integer NOT NULL DEFAULT 5, -- day of jalali month (1-30)
  debt_auto_schedule_hour integer NOT NULL DEFAULT 9, -- hour 0-23
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sms settings"
  ON public.sms_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert sms settings"
  ON public.sms_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update sms settings"
  ON public.sms_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete sms settings"
  ON public.sms_settings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE TRIGGER update_sms_settings_updated_at
  BEFORE UPDATE ON public.sms_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SMS Templates Table
-- ============================================
CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  template_key text NOT NULL, -- 'debt_report' | 'payment_thanks' | 'reservation_approved' | 'reservation_rejected' | 'balance_reminder'
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(building_id, template_key)
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sms templates"
  ON public.sms_templates FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert sms templates"
  ON public.sms_templates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update sms templates"
  ON public.sms_templates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete sms templates"
  ON public.sms_templates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SMS Logs Table
-- ============================================
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  template_key text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  recipient_role text, -- 'owner' | 'resident'
  unit_id uuid,
  message_body text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  provider_message_id text,
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view sms logs"
  ON public.sms_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can insert sms logs"
  ON public.sms_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete sms logs"
  ON public.sms_logs FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE INDEX idx_sms_logs_building_sent ON public.sms_logs(building_id, sent_at DESC);

-- ============================================
-- Default templates trigger for new buildings
-- ============================================
CREATE OR REPLACE FUNCTION public.create_default_sms_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.sms_templates (building_id, template_key, title, body) VALUES
    (NEW.id, 'debt_report', 'گزارش بدهی', 'سلام {نام}،
بدهی واحد {واحد} در ساختمان {ساختمان}: {مبلغ} تومان
لطفاً نسبت به پرداخت اقدام فرمایید.
سپاس'),
    (NEW.id, 'payment_thanks', 'تشکر پرداخت', 'سلام {نام}،
پرداخت {مبلغ} تومان برای واحد {واحد} با موفقیت ثبت شد.
مانده بدهی فعلی: {مانده} تومان
با تشکر - مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'reservation_approved', 'تأیید رزرو', 'سلام {نام}،
درخواست رزرو {مکان} برای تاریخ {تاریخ} ساعت {ساعت} تأیید شد.
مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'reservation_rejected', 'رد رزرو', 'سلام {نام}،
متأسفانه درخواست رزرو {مکان} برای تاریخ {تاریخ} رد شد.
{توضیحات}
مدیریت ساختمان {ساختمان}'),
    (NEW.id, 'balance_reminder', 'یادآوری مانده', 'سلام {نام}،
یادآوری: مانده بدهی واحد {واحد} برابر {مانده} تومان است.
مدیریت ساختمان {ساختمان}');
  
  -- also create empty sms_settings row
  INSERT INTO public.sms_settings (building_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_building_created_sms
  AFTER INSERT ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.create_default_sms_templates();
