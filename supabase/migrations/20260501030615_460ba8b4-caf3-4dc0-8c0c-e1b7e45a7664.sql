
CREATE OR REPLACE FUNCTION public.resident_pay_and_clear(
  _building_id uuid,
  _unit_id uuid,
  _payments jsonb,
  _charge_ids_to_clear uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_member boolean;
  _is_manager boolean;
  _payment jsonb;
BEGIN
  -- Verify the caller is either a manager of this building OR a member assigned to this unit
  SELECT public.is_building_manager(auth.uid(), _building_id) INTO _is_manager;

  SELECT EXISTS (
    SELECT 1 FROM public.building_members
    WHERE user_id = auth.uid()
      AND building_id = _building_id
      AND unit_id = _unit_id
  ) INTO _is_member;

  IF NOT (_is_manager OR _is_member OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: not authorized for this unit';
  END IF;

  -- Insert payment records
  FOR _payment IN SELECT * FROM jsonb_array_elements(_payments)
  LOOP
    INSERT INTO public.payments (
      building_id, unit_id, amount, fund_type,
      payment_date, month, year, description,
      owner_name, resident_name
    ) VALUES (
      _building_id,
      _unit_id,
      (_payment->>'amount')::numeric,
      (_payment->>'fund_type')::fund_type,
      (_payment->>'payment_date')::date,
      (_payment->>'month')::int,
      (_payment->>'year')::int,
      _payment->>'description',
      _payment->>'owner_name',
      _payment->>'resident_name'
    );
  END LOOP;

  -- Clear paid unit_charges (only for this unit/building to avoid abuse)
  IF _charge_ids_to_clear IS NOT NULL AND array_length(_charge_ids_to_clear, 1) > 0 THEN
    DELETE FROM public.unit_charges
    WHERE id = ANY(_charge_ids_to_clear)
      AND unit_id = _unit_id
      AND building_id = _building_id;
  END IF;
END;
$$;
