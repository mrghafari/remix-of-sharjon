
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_per_unit_rial numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_contact_only boolean NOT NULL DEFAULT false;

-- Migrate from platform_settings.pricing_plans (stored in thousand Rial per unit per year)
DO $$
DECLARE
  _plans jsonb;
  _p jsonb;
  _tier text;
  _price numeric;
  _contact boolean;
  _idx int;
BEGIN
  SELECT setting_value->'plans' INTO _plans FROM public.platform_settings WHERE setting_key='pricing_plans' LIMIT 1;
  IF _plans IS NULL THEN RETURN; END IF;
  FOR _idx IN 0..jsonb_array_length(_plans)-1 LOOP
    _p := _plans->_idx;
    _tier := CASE _idx WHEN 0 THEN 'free' WHEN 1 THEN 'pro' WHEN 2 THEN 'enterprise' END;
    _contact := COALESCE((_p->>'contact')::boolean, false);
    -- parse digits only (handle Persian digits via translate)
    _price := COALESCE(NULLIF(regexp_replace(
      translate(COALESCE(_p->>'price',''), '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'),
      '[^0-9.]', '', 'g'), '')::numeric, 0);
    UPDATE public.subscription_plans
       SET price_per_unit_rial = ROUND(_price * 1000),
           is_contact_only = _contact
     WHERE tier_key = _tier;
  END LOOP;
END $$;
