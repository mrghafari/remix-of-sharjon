CREATE OR REPLACE FUNCTION public.resident_pay_and_clear(_building_id uuid, _unit_id uuid, _payments jsonb, _charge_ids_to_clear uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_member boolean;
  _is_manager boolean;
  _payment jsonb;
  _charge_pay_amount numeric := 0;
  _extra_pay_amount numeric := 0;
  _remaining numeric;
  _charge record;
  _outstanding numeric;
  _apply numeric;
BEGIN
  SELECT public.is_building_manager(auth.uid(), _building_id) INTO _is_manager;
  SELECT EXISTS (
    SELECT 1 FROM public.building_members
    WHERE user_id = auth.uid() AND building_id = _building_id AND unit_id = _unit_id
  ) INTO _is_member;

  IF NOT (_is_manager OR _is_member OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: not authorized for this unit';
  END IF;

  FOR _payment IN SELECT * FROM jsonb_array_elements(_payments)
  LOOP
    INSERT INTO public.payments (
      building_id, unit_id, amount, fund_type,
      payment_date, month, year, description,
      owner_name, resident_name
    ) VALUES (
      _building_id, _unit_id,
      (_payment->>'amount')::numeric,
      (_payment->>'fund_type')::fund_type,
      (_payment->>'payment_date')::date,
      (_payment->>'month')::int,
      (_payment->>'year')::int,
      _payment->>'description',
      _payment->>'owner_name',
      _payment->>'resident_name'
    );

    IF (_payment->>'fund_type') = 'charge' THEN
      _charge_pay_amount := _charge_pay_amount + COALESCE((_payment->>'amount')::numeric, 0);
    ELSIF (_payment->>'fund_type') = 'extra_charge' THEN
      _extra_pay_amount := _extra_pay_amount + COALESCE((_payment->>'amount')::numeric, 0);
    END IF;
  END LOOP;

  IF _charge_ids_to_clear IS NOT NULL AND array_length(_charge_ids_to_clear, 1) > 0 THEN
    -- CHARGE: first consume discount rows (negative amounts) and add their absolute value back to available payment
    _remaining := GREATEST(_charge_pay_amount, 0);
    FOR _charge IN
      SELECT id, amount
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'charge'
        AND amount < 0
        AND COALESCE(paid_amount, 0) = 0
      FOR UPDATE
    LOOP
      UPDATE public.unit_charges
        SET paid_amount = _charge.amount,
            paid_at = now()
        WHERE id = _charge.id;
      _remaining := _remaining + ABS(_charge.amount);
    END LOOP;

    -- Then apply remaining to regular (positive) charge rows
    FOR _charge IN
      SELECT id, amount, COALESCE(paid_amount,0) AS paid_amount
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'charge'
        AND amount >= 0
      ORDER BY year ASC, month ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN _remaining <= 0;
      _outstanding := GREATEST(_charge.amount - _charge.paid_amount, 0);
      IF _outstanding <= 0 THEN CONTINUE; END IF;
      _apply := LEAST(_remaining, _outstanding);
      UPDATE public.unit_charges
        SET paid_amount = COALESCE(paid_amount,0) + _apply,
            paid_at = CASE WHEN COALESCE(paid_amount,0) + _apply >= amount THEN now() ELSE paid_at END
        WHERE id = _charge.id;
      _remaining := _remaining - _apply;
    END LOOP;

    -- EXTRA_CHARGE: same pattern
    _remaining := GREATEST(_extra_pay_amount, 0);
    FOR _charge IN
      SELECT id, amount
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'extra_charge'
        AND amount < 0
        AND COALESCE(paid_amount, 0) = 0
      FOR UPDATE
    LOOP
      UPDATE public.unit_charges
        SET paid_amount = _charge.amount,
            paid_at = now()
        WHERE id = _charge.id;
      _remaining := _remaining + ABS(_charge.amount);
    END LOOP;

    FOR _charge IN
      SELECT id, amount, COALESCE(paid_amount,0) AS paid_amount
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'extra_charge'
        AND amount >= 0
      ORDER BY year ASC, month ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN _remaining <= 0;
      _outstanding := GREATEST(_charge.amount - _charge.paid_amount, 0);
      IF _outstanding <= 0 THEN CONTINUE; END IF;
      _apply := LEAST(_remaining, _outstanding);
      UPDATE public.unit_charges
        SET paid_amount = COALESCE(paid_amount,0) + _apply,
            paid_at = CASE WHEN COALESCE(paid_amount,0) + _apply >= amount THEN now() ELSE paid_at END
        WHERE id = _charge.id;
      _remaining := _remaining - _apply;
    END LOOP;
  END IF;
END;
$function$;