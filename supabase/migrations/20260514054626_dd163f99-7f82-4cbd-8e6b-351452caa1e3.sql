CREATE POLICY "Members can view manager units"
ON public.units FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.managers m
    WHERE m.unit_id = units.id
      AND m.building_id = units.building_id
      AND public.is_building_member(auth.uid(), units.building_id)
  )
);