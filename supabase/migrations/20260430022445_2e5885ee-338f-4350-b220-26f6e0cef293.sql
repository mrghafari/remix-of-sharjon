
-- Table for tracking owner/resident history per unit
CREATE TABLE public.unit_occupancy_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  person_type TEXT NOT NULL CHECK (person_type IN ('owner','resident')),
  person_name TEXT NOT NULL,
  person_phone TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_uoh_building ON public.unit_occupancy_history(building_id);
CREATE INDEX idx_uoh_unit ON public.unit_occupancy_history(unit_id);
CREATE INDEX idx_uoh_dates ON public.unit_occupancy_history(start_date, end_date);

ALTER TABLE public.unit_occupancy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view occupancy history"
ON public.unit_occupancy_history FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert occupancy history"
ON public.unit_occupancy_history FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update occupancy history"
ON public.unit_occupancy_history FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete occupancy history"
ON public.unit_occupancy_history FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE TRIGGER update_uoh_updated_at
BEFORE UPDATE ON public.unit_occupancy_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-track owner/resident changes from units table
CREATE OR REPLACE FUNCTION public.track_unit_occupancy_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On insert: seed initial owner & resident records
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_name IS NOT NULL AND NEW.owner_name <> '' THEN
      INSERT INTO public.unit_occupancy_history (building_id, unit_id, person_type, person_name, person_phone, start_date, created_by)
      VALUES (NEW.building_id, NEW.id, 'owner', NEW.owner_name, NEW.phone, CURRENT_DATE, auth.uid());
    END IF;
    IF NEW.resident_name IS NOT NULL AND NEW.resident_name <> '' THEN
      INSERT INTO public.unit_occupancy_history (building_id, unit_id, person_type, person_name, person_phone, start_date, created_by)
      VALUES (NEW.building_id, NEW.id, 'resident', NEW.resident_name, NEW.resident_phone, CURRENT_DATE, auth.uid());
    END IF;
    RETURN NEW;
  END IF;

  -- On update: close previous and open new if owner changed
  IF COALESCE(OLD.owner_name,'') IS DISTINCT FROM COALESCE(NEW.owner_name,'') THEN
    UPDATE public.unit_occupancy_history
      SET end_date = CURRENT_DATE, updated_at = now()
      WHERE unit_id = NEW.id AND person_type = 'owner' AND end_date IS NULL;
    IF NEW.owner_name IS NOT NULL AND NEW.owner_name <> '' THEN
      INSERT INTO public.unit_occupancy_history (building_id, unit_id, person_type, person_name, person_phone, start_date, created_by)
      VALUES (NEW.building_id, NEW.id, 'owner', NEW.owner_name, NEW.phone, CURRENT_DATE, auth.uid());
    END IF;
  END IF;

  -- On update: close previous and open new if resident changed
  IF COALESCE(OLD.resident_name,'') IS DISTINCT FROM COALESCE(NEW.resident_name,'') THEN
    UPDATE public.unit_occupancy_history
      SET end_date = CURRENT_DATE, updated_at = now()
      WHERE unit_id = NEW.id AND person_type = 'resident' AND end_date IS NULL;
    IF NEW.resident_name IS NOT NULL AND NEW.resident_name <> '' THEN
      INSERT INTO public.unit_occupancy_history (building_id, unit_id, person_type, person_name, person_phone, start_date, created_by)
      VALUES (NEW.building_id, NEW.id, 'resident', NEW.resident_name, NEW.resident_phone, CURRENT_DATE, auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_unit_occupancy
AFTER INSERT OR UPDATE OF owner_name, resident_name, phone, resident_phone ON public.units
FOR EACH ROW EXECUTE FUNCTION public.track_unit_occupancy_changes();

-- Backfill: seed history from current units state for buildings that have none
INSERT INTO public.unit_occupancy_history (building_id, unit_id, person_type, person_name, person_phone, start_date)
SELECT u.building_id, u.id, 'owner', u.owner_name, u.phone, COALESCE(u.created_at::date, CURRENT_DATE)
FROM public.units u
WHERE u.owner_name IS NOT NULL AND u.owner_name <> '';

INSERT INTO public.unit_occupancy_history (building_id, unit_id, person_type, person_name, person_phone, start_date)
SELECT u.building_id, u.id, 'resident', u.resident_name, u.resident_phone, COALESCE(u.created_at::date, CURRENT_DATE)
FROM public.units u
WHERE u.resident_name IS NOT NULL AND u.resident_name <> '';
