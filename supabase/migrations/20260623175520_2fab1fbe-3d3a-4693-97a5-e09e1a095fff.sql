
-- Storage policies for unit-listings bucket
-- File path convention: {building_id}/{unit_id}/{filename}

CREATE POLICY "Manager/member view unit-listings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'unit-listings'
  AND (
    public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_building_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR (
      public.is_approved_agent(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = ((storage.foldername(name))[2])::uuid
          AND u.listing_active = true
      )
    )
  )
);

CREATE POLICY "Manager/member insert unit-listings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'unit-listings'
  AND (
    public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_building_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Manager/member update unit-listings"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'unit-listings'
  AND (
    public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_building_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Manager/member delete unit-listings"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'unit-listings'
  AND (
    public.has_role(auth.uid(),'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
    OR public.is_building_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);
