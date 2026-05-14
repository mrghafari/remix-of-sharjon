
-- Function: register the building creator as the first internal/external manager
CREATE OR REPLACE FUNCTION public.auto_register_initial_manager()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _main_role_id uuid;
  _full_name text;
  _phone text;
  _display_name text;
BEGIN
  -- Skip super admins
  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure 'main' manager role exists for this building
  SELECT id INTO _main_role_id
  FROM public.manager_roles
  WHERE building_id = NEW.id AND name = 'main'
  LIMIT 1;

  IF _main_role_id IS NULL THEN
    INSERT INTO public.manager_roles (building_id, name, label, is_system, sort_order)
    VALUES (NEW.id, 'main', 'مدیر اصلی', true, 1)
    RETURNING id INTO _main_role_id;
  END IF;

  -- Get profile info
  SELECT full_name, phone INTO _full_name, _phone
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  _display_name := COALESCE(NULLIF(_full_name, ''), NULLIF(_phone, ''), 'مدیر');

  -- Skip if already has an active manager for the main role
  IF EXISTS (
    SELECT 1 FROM public.managers
    WHERE building_id = NEW.id AND role_id = _main_role_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.managers (
    building_id, role_id, role_type, external_name, mobile, email,
    start_date, is_active, charge_discount_percent, extra_charge_discount_percent
  )
  VALUES (
    NEW.id, _main_role_id, 'external', _display_name,
    NULLIF(_phone, ''), NULL,
    CURRENT_DATE, true, 0, 0
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any with same name then create with a name that sorts after
-- create_default_manager_roles trigger so manager_roles exist first.
DROP TRIGGER IF EXISTS zzz_auto_register_initial_manager ON public.buildings;
CREATE TRIGGER zzz_auto_register_initial_manager
AFTER INSERT ON public.buildings
FOR EACH ROW
EXECUTE FUNCTION public.auto_register_initial_manager();

-- Backfill: for buildings that have a manager in building_members but
-- no active manager record in the managers table, create one.
DO $$
DECLARE
  _b record;
  _main_role_id uuid;
  _full_name text;
  _phone text;
  _display_name text;
BEGIN
  FOR _b IN
    SELECT b.id AS building_id, bm.user_id
    FROM public.buildings b
    JOIN public.building_members bm
      ON bm.building_id = b.id AND bm.role = 'manager'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.managers m
      WHERE m.building_id = b.id AND m.is_active = true
    )
  LOOP
    SELECT id INTO _main_role_id
    FROM public.manager_roles
    WHERE building_id = _b.building_id AND name = 'main'
    LIMIT 1;

    IF _main_role_id IS NULL THEN
      INSERT INTO public.manager_roles (building_id, name, label, is_system, sort_order)
      VALUES (_b.building_id, 'main', 'مدیر اصلی', true, 1)
      RETURNING id INTO _main_role_id;
    END IF;

    SELECT full_name, phone INTO _full_name, _phone
    FROM public.profiles WHERE user_id = _b.user_id LIMIT 1;

    _display_name := COALESCE(NULLIF(_full_name, ''), NULLIF(_phone, ''), 'مدیر');

    INSERT INTO public.managers (
      building_id, role_id, role_type, external_name, mobile, email,
      start_date, is_active, charge_discount_percent, extra_charge_discount_percent
    )
    VALUES (
      _b.building_id, _main_role_id, 'external', _display_name,
      NULLIF(_phone, ''), NULL,
      CURRENT_DATE, true, 0, 0
    );
  END LOOP;
END $$;
