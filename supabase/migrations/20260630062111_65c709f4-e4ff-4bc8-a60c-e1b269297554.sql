
-- Add secondary phone fields for owner and resident on units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS phone_secondary text,
  ADD COLUMN IF NOT EXISTS resident_phone_secondary text;

-- RPC: allow owner/resident of a unit to update their own secondary phone
CREATE OR REPLACE FUNCTION public.resident_update_secondary_phone(
  _unit_id uuid,
  _role text,
  _phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _building_id uuid;
  _is_member boolean;
  _is_manager boolean;
BEGIN
  SELECT building_id INTO _building_id FROM public.units WHERE id = _unit_id;
  IF _building_id IS NULL THEN
    RAISE EXCEPTION 'واحد یافت نشد';
  END IF;

  SELECT public.is_building_manager(auth.uid(), _building_id) INTO _is_manager;
  SELECT EXISTS (
    SELECT 1 FROM public.building_members
    WHERE user_id = auth.uid() AND building_id = _building_id AND unit_id = _unit_id
  ) INTO _is_member;

  IF NOT (_is_manager OR _is_member OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'دسترسی غیرمجاز';
  END IF;

  IF _role = 'owner' THEN
    UPDATE public.units SET phone_secondary = NULLIF(trim(_phone), '') WHERE id = _unit_id;
  ELSIF _role = 'resident' THEN
    UPDATE public.units SET resident_phone_secondary = NULLIF(trim(_phone), '') WHERE id = _unit_id;
  ELSE
    RAISE EXCEPTION 'نقش نامعتبر است';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resident_update_secondary_phone(uuid, text, text) TO authenticated;
