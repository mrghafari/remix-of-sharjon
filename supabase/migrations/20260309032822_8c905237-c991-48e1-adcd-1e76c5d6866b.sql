
-- Function for super admin to create a building and assign it to a specific customer
CREATE OR REPLACE FUNCTION public.admin_create_building_for_user(
  _user_id uuid,
  _name text,
  _address text DEFAULT NULL,
  _total_units integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _building_id uuid;
BEGIN
  -- Only super admins can call this
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Create the building
  INSERT INTO public.buildings (name, address, total_units)
  VALUES (_name, _address, _total_units)
  RETURNING id INTO _building_id;

  -- Remove the auto-created membership for super admin (from trigger)
  DELETE FROM public.building_members 
  WHERE building_id = _building_id AND user_id = auth.uid();

  -- Add the target customer as manager
  INSERT INTO public.building_members (user_id, building_id, role)
  VALUES (_user_id, _building_id, 'manager');

  RETURN _building_id;
END;
$$;

-- Function for super admin to reassign a building to a different user
CREATE OR REPLACE FUNCTION public.admin_reassign_building(
  _building_id uuid,
  _new_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Remove existing manager
  DELETE FROM public.building_members 
  WHERE building_id = _building_id AND role = 'manager';

  -- Assign new manager
  INSERT INTO public.building_members (user_id, building_id, role)
  VALUES (_new_user_id, _building_id, 'manager')
  ON CONFLICT (user_id, building_id) DO UPDATE SET role = 'manager';
END;
$$;
