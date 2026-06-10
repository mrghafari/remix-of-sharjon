
-- 1) expenses SELECT: authenticated only
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
CREATE POLICY "Members can view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), building_id));

-- 2) reservations SELECT: authenticated only
DROP POLICY IF EXISTS "Members can view reservations" ON public.reservations;
CREATE POLICY "Members can view reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (public.is_building_member(auth.uid(), building_id));

-- 3) manager_transfer_otps: restrict SELECT to super admins; keep insert/update for managers
DROP POLICY IF EXISTS "Managers manage transfer otps for their building" ON public.manager_transfer_otps;

CREATE POLICY "Super admins can view transfer otps"
  ON public.manager_transfer_otps FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Managers can create transfer otps for their building"
  ON public.manager_transfer_otps FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_building_manager(auth.uid(), building_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Managers can update transfer otps for their building"
  ON public.manager_transfer_otps FOR UPDATE
  TO authenticated
  USING (
    public.is_building_manager(auth.uid(), building_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_building_manager(auth.uid(), building_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Super admins can delete transfer otps"
  ON public.manager_transfer_otps FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 4) message-images INSERT must place file under uploader's user id folder
DROP POLICY IF EXISTS "Authenticated users can upload message images" ON storage.objects;
CREATE POLICY "Authenticated users can upload message images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
