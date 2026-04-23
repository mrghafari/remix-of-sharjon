-- Temporarily disable the protection trigger to clean up duplicates
ALTER TABLE public.building_bank_accounts DISABLE TRIGGER ALL;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY building_id ORDER BY created_at DESC) AS rn
  FROM public.building_bank_accounts
  WHERE is_rejected = false
)
DELETE FROM public.building_bank_accounts
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.building_bank_accounts ENABLE TRIGGER ALL;

-- Enforce one non-rejected account per building
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_bank_account_per_building
ON public.building_bank_accounts (building_id)
WHERE is_rejected = false;