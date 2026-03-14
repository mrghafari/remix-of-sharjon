
CREATE OR REPLACE FUNCTION public.get_voter_hash(_poll_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
  SELECT encode(extensions.digest((auth.uid()::text || _poll_id::text || 'anonymous_salt_v1')::bytea, 'sha256'), 'hex')
$$;
