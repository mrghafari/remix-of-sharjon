
-- 1. Remove public profiles export policy
DROP POLICY IF EXISTS "allow_export" ON public.profiles;

-- 2. Tighten payments SELECT: residents only see their own unit
DROP POLICY IF EXISTS "Members can view payments" ON public.payments;
CREATE POLICY "Managers can view payments"
ON public.payments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));
CREATE POLICY "Residents can view payments for own unit"
ON public.payments FOR SELECT TO authenticated
USING (
  unit_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.building_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.building_id = payments.building_id
      AND bm.unit_id = payments.unit_id
  )
);

-- 3. Tighten unit_charges SELECT: residents only see their own unit
DROP POLICY IF EXISTS "Members can view unit charges" ON public.unit_charges;
CREATE POLICY "Managers can view unit charges"
ON public.unit_charges FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));
CREATE POLICY "Residents can view own unit charges"
ON public.unit_charges FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.building_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.building_id = unit_charges.building_id
      AND bm.unit_id = unit_charges.unit_id
  )
);

-- 4. Restrict managers SELECT to managers/super_admins only (hides email/mobile from residents)
DROP POLICY IF EXISTS "Members can view managers" ON public.managers;
CREATE POLICY "Managers can view managers"
ON public.managers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- 5. Restrict unit_document_access_blocks SELECT to managers only
DROP POLICY IF EXISTS "Members can view document access blocks" ON public.unit_document_access_blocks;
CREATE POLICY "Managers can view document access blocks"
ON public.unit_document_access_blocks FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- 6. building_messages: remove the NULL-recipient broadcast loophole
DROP POLICY IF EXISTS "Members can view their own messages" ON public.building_messages;
CREATE POLICY "Members can view their own messages"
ON public.building_messages FOR SELECT TO authenticated
USING (
  is_building_member(auth.uid(), building_id)
  AND (sender_user_id = auth.uid() OR recipient_user_id = auth.uid())
);
