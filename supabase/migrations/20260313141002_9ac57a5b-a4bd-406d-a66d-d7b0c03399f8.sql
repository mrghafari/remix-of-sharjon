
-- Prevent same unit from having multiple active manager records in the same building
CREATE UNIQUE INDEX unique_active_manager_per_unit 
ON public.managers (building_id, unit_id) 
WHERE (is_active = true AND unit_id IS NOT NULL);
