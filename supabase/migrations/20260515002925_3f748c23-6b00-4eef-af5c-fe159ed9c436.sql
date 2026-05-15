
-- 1) BEFORE trigger on managers: convert external -> internal if mobile matches a unit
CREATE OR REPLACE FUNCTION public.auto_link_manager_to_unit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _unit RECORD;
BEGIN
  IF NEW.role_type = 'external' AND NEW.mobile IS NOT NULL AND NEW.mobile <> '' THEN
    SELECT id, phone, resident_phone INTO _unit
    FROM public.units
    WHERE building_id = NEW.building_id
      AND (phone = NEW.mobile OR resident_phone = NEW.mobile)
    ORDER BY (phone = NEW.mobile) DESC
    LIMIT 1;

    IF FOUND THEN
      NEW.unit_id := _unit.id;
      IF _unit.phone = NEW.mobile THEN
        NEW.role_type := 'owner';
      ELSE
        NEW.role_type := 'resident';
      END IF;
      NEW.external_name := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_manager_to_unit ON public.managers;
CREATE TRIGGER trg_auto_link_manager_to_unit
BEFORE INSERT OR UPDATE OF mobile, role_type, building_id ON public.managers
FOR EACH ROW EXECUTE FUNCTION public.auto_link_manager_to_unit();

-- 2) AFTER trigger on units: when unit phone is set/changed, convert any matching external manager
CREATE OR REPLACE FUNCTION public.auto_link_units_to_managers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    UPDATE public.managers
    SET role_type = 'owner',
        unit_id = NEW.id,
        external_name = NULL,
        updated_at = now()
    WHERE building_id = NEW.building_id
      AND is_active = true
      AND role_type = 'external'
      AND mobile = NEW.phone;
  END IF;

  IF NEW.resident_phone IS NOT NULL AND NEW.resident_phone <> '' THEN
    UPDATE public.managers
    SET role_type = 'resident',
        unit_id = NEW.id,
        external_name = NULL,
        updated_at = now()
    WHERE building_id = NEW.building_id
      AND is_active = true
      AND role_type = 'external'
      AND mobile = NEW.resident_phone;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_units_to_managers ON public.units;
CREATE TRIGGER trg_auto_link_units_to_managers
AFTER INSERT OR UPDATE OF phone, resident_phone ON public.units
FOR EACH ROW EXECUTE FUNCTION public.auto_link_units_to_managers();

-- 3) Backfill: convert any existing external managers whose mobile matches a unit phone
UPDATE public.managers m
SET role_type = CASE WHEN u.phone = m.mobile THEN 'owner' ELSE 'resident' END,
    unit_id = u.id,
    external_name = NULL,
    updated_at = now()
FROM public.units u
WHERE m.building_id = u.building_id
  AND m.role_type = 'external'
  AND m.is_active = true
  AND m.mobile IS NOT NULL
  AND (u.phone = m.mobile OR u.resident_phone = m.mobile);
