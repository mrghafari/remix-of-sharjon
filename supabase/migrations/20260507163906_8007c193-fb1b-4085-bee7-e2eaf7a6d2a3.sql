
-- 1) sms_settings: restrict SELECT to managers only (contains API keys)
DROP POLICY IF EXISTS "Members can view sms settings" ON public.sms_settings;
CREATE POLICY "Managers can view sms settings"
ON public.sms_settings
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- 2) units: residents may only see their own unit; managers see all
DROP POLICY IF EXISTS "Members can view units" ON public.units;
CREATE POLICY "Managers and own-unit residents can view units"
ON public.units
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_building_manager(auth.uid(), building_id)
  OR EXISTS (
    SELECT 1 FROM public.building_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.building_id = units.building_id
      AND bm.unit_id = units.id
  )
);

-- 3) unit_occupancy_history: scope residents to own unit
DROP POLICY IF EXISTS "Members can view occupancy history" ON public.unit_occupancy_history;
CREATE POLICY "Managers and own-unit residents can view occupancy history"
ON public.unit_occupancy_history
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_building_manager(auth.uid(), building_id)
  OR EXISTS (
    SELECT 1 FROM public.building_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.building_id = unit_occupancy_history.building_id
      AND bm.unit_id = unit_occupancy_history.unit_id
  )
);

-- 4) expense_unit_shares: scope residents to own unit
DROP POLICY IF EXISTS "Members can view expense shares" ON public.expense_unit_shares;
CREATE POLICY "Managers and own-unit residents can view expense shares"
ON public.expense_unit_shares
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_building_manager(auth.uid(), building_id)
  OR EXISTS (
    SELECT 1 FROM public.building_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.building_id = expense_unit_shares.building_id
      AND bm.unit_id = expense_unit_shares.unit_id
  )
);

-- 5) projects: change role from public to authenticated
DROP POLICY IF EXISTS "Members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can update projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can delete projects" ON public.projects;

CREATE POLICY "Members can view projects"
ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert projects"
ON public.projects
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update projects"
ON public.projects
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete projects"
ON public.projects
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- 6) Storage: lock down expense-attachments to building managers (path: {building_id}/...)
DROP POLICY IF EXISTS "Authenticated users can upload expense attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view expense attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete expense attachments" ON storage.objects;

CREATE POLICY "Members can view expense attachments"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'expense-attachments'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_building_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Managers can upload expense attachments"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'expense-attachments'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Managers can delete expense attachments"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'expense-attachments'
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

-- Make the bucket private so signed URLs are required
UPDATE storage.buckets SET public = false WHERE id = 'expense-attachments';
