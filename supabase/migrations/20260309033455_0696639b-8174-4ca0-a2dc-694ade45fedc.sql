
DROP POLICY IF EXISTS "Authenticated users can create buildings" ON public.buildings;
CREATE POLICY "Authenticated users can create buildings" ON public.buildings
FOR INSERT TO authenticated
WITH CHECK (true);
