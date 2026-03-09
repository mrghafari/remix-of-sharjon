
CREATE OR REPLACE FUNCTION public.create_default_allocation_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.category_allocation_settings (
    category_id,
    building_id,
    category,
    allowed_allocation_types,
    default_allocation_type
  )
  VALUES (
    NEW.id,
    NEW.building_id,
    NULL,
    ARRAY['equal', 'by_area', 'by_residents', 'by_area_residents', 'single_unit']::public.allocation_type[],
    'equal'
  );
  RETURN NEW;
END;
$$;
