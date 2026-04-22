-- Allow residents/owners to insert payments for their own unit (online payment)
CREATE POLICY "Residents can insert payments for their unit"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.building_members bm
    WHERE bm.user_id = auth.uid()
      AND bm.building_id = payments.building_id
      AND bm.unit_id = payments.unit_id
  )
);