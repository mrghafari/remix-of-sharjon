
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS tier_key text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_tier_key_uniq
  ON public.subscription_plans(tier_key) WHERE tier_key IS NOT NULL;

INSERT INTO public.subscription_plans (name, tier_key, unit_quota, duration_days, price_rial, description, is_active, sort_order, features)
VALUES
  ('رایگان', 'free', 1, 365, 0, 'مناسب برای یک ساختمان کوچک', true, 1,
    '["۱ ساختمان","حداکثر ۱۰ واحد","گزارش‌های پایه","پشتیبانی ایمیلی"]'::jsonb),
  ('حرفه‌ای', 'pro', 1, 365, 0, 'برای مدیران حرفه‌ای ساختمان', true, 2,
    '["تا ۵ ساختمان","واحدهای نامحدود","گزارش‌های پیشرفته","اطلاع‌رسانی خودکار","پشتیبانی اولویت‌دار"]'::jsonb),
  ('سازمانی', 'enterprise', 1, 365, 0, 'برای شرکت‌های مدیریت ساختمان', true, 3,
    '["ساختمان‌های نامحدود","API اختصاصی","داشبورد مدیریتی","SLA اختصاصی","پشتیبانی ۲۴/۷"]'::jsonb)
ON CONFLICT (tier_key) WHERE tier_key IS NOT NULL DO NOTHING;
