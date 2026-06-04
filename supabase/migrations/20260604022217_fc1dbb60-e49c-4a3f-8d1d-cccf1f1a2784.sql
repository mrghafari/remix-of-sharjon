
-- 1. Units: remove overly permissive "Members can view manager units" policy
DROP POLICY IF EXISTS "Members can view manager units" ON public.units;

-- 2. Expenses: restrict resident SELECT to expenses tied to their unit (via expense_unit_shares)
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
CREATE POLICY "Members can view expenses"
ON public.expenses
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_building_manager(auth.uid(), building_id)
  OR EXISTS (
    SELECT 1
    FROM public.expense_unit_shares s
    JOIN public.building_members bm
      ON bm.user_id = auth.uid()
     AND bm.building_id = expenses.building_id
     AND bm.unit_id = s.unit_id
    WHERE s.expense_id = expenses.id
  )
);

-- 3. Reservations: residents only see their own; managers/super_admin see all
DROP POLICY IF EXISTS "Members can view reservations" ON public.reservations;
CREATE POLICY "Members can view reservations"
ON public.reservations
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_building_manager(auth.uid(), building_id)
  OR requester_user_id = auth.uid()
);

-- 4. Building polls: add per-poll random salt to defeat vote linkability
ALTER TABLE public.building_polls
  ADD COLUMN IF NOT EXISTS vote_salt text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

-- Preserve existing votes by keeping legacy salt for already-created polls
UPDATE public.building_polls
SET vote_salt = 'anonymous_salt_v1'
WHERE created_at < now() AND vote_salt IS NOT NULL
  AND vote_salt <> 'anonymous_salt_v1'
  AND EXISTS (SELECT 1 FROM public.building_poll_votes v WHERE v.poll_id = building_polls.id);

-- Update voter hash function to use per-poll salt
CREATE OR REPLACE FUNCTION public.get_voter_hash(_poll_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT md5(auth.uid()::text || _poll_id::text || COALESCE(
    (SELECT vote_salt FROM public.building_polls WHERE id = _poll_id),
    'anonymous_salt_v1'
  ))
$function$;
