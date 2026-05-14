
CREATE POLICY "Members can update their own poll vote"
ON public.building_poll_votes
FOR UPDATE
TO authenticated
USING (
  voter_hash = public.get_voter_hash(poll_id)
  AND EXISTS (
    SELECT 1 FROM public.building_polls p
    WHERE p.id = poll_id
      AND p.is_active = true
      AND (p.ends_at IS NULL OR p.ends_at > now())
  )
)
WITH CHECK (
  voter_hash = public.get_voter_hash(poll_id)
);
