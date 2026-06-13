
-- 1. Hide vote_salt from clients (still readable by SECURITY DEFINER functions like get_voter_hash)
REVOKE SELECT (vote_salt) ON public.building_polls FROM anon, authenticated;

-- 2. Remove client-side INSERT path for manager_transfer_otps; only the edge function
--    (service_role) should create OTP rows. This blocks managers from forging codes.
DROP POLICY IF EXISTS "Managers can create transfer otps for their building" ON public.manager_transfer_otps;
