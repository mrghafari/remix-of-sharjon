
DROP POLICY IF EXISTS "Managers and own-unit residents can view occupancy history" ON public.unit_occupancy_history;

CREATE POLICY "Managers can view occupancy history"
ON public.unit_occupancy_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.is_building_manager(auth.uid(), building_id)
);
