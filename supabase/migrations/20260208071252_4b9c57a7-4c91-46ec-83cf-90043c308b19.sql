
-- Remove the legacy UNIQUE constraint on the enum category column
-- This constraint is no longer needed since we now use category_id for linking
ALTER TABLE public.category_allocation_settings 
DROP CONSTRAINT category_allocation_settings_category_key;

-- Make the category column nullable since it's a legacy column
ALTER TABLE public.category_allocation_settings 
ALTER COLUMN category DROP NOT NULL;

-- Update the trigger function to not require the legacy category column
CREATE OR REPLACE FUNCTION public.create_default_allocation_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.category_allocation_settings (
    category_id, 
    category,
    allowed_allocation_types, 
    default_allocation_type
  )
  VALUES (
    NEW.id, 
    NULL,
    ARRAY['equal', 'by_area', 'by_residents', 'by_area_residents', 'single_unit']::public.allocation_type[], 
    'equal'
  );
  RETURN NEW;
END;
$function$;
