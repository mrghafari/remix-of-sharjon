CREATE OR REPLACE FUNCTION public.get_enabled_payment_gateways(_building_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  manager_id uuid;
  cfg jsonb;
  cs_row record;
BEGIN
  SELECT user_id INTO manager_id
  FROM public.building_members
  WHERE building_id = _building_id AND role = 'manager'
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF manager_id IS NOT NULL THEN
    SELECT setting_value, is_enabled INTO cs_row
    FROM public.customer_settings
    WHERE user_id = manager_id AND setting_key = 'payment_gateways'
    LIMIT 1;
    IF cs_row.is_enabled AND cs_row.setting_value IS NOT NULL THEN
      cfg := cs_row.setting_value;
    END IF;
  END IF;

  IF cfg IS NULL THEN
    SELECT setting_value INTO cfg
    FROM public.platform_settings
    WHERE setting_key = 'payment_gateways' AND is_enabled = true
    LIMIT 1;
  END IF;

  RETURN COALESCE(cfg, '{}'::jsonb);
END;
$function$