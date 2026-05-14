ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_unit_number_key;
ALTER TABLE public.units ADD CONSTRAINT units_building_unit_number_key UNIQUE (building_id, unit_number);