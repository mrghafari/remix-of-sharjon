
-- 1) Remove permissive manager UPDATE on OTPs (consume_manager_transfer_otp runs SECURITY DEFINER; init/verify uses service role)
DROP POLICY IF EXISTS "Managers can update transfer otps for their building" ON public.manager_transfer_otps;

-- 2) Tighten ticket-attachments INSERT to require first folder = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
CREATE POLICY "Users can upload ticket attachments to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) Hide vote_salt from building members; super_admin retains full access via separate policy
-- Find current member SELECT policies on building_polls and restrict by excluding salt access through a column grant.
-- Simplest approach: REVOKE column SELECT on vote_salt from authenticated; SECURITY DEFINER function get_voter_hash still works.
REVOKE SELECT (vote_salt) ON public.building_polls FROM authenticated;
REVOKE SELECT (vote_salt) ON public.building_polls FROM anon;
