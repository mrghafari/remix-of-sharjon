
-- Add owner/resident snapshot to expense_unit_shares
ALTER TABLE public.expense_unit_shares
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS resident_name text;

-- Add owner/resident snapshot to unit_charges
ALTER TABLE public.unit_charges
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS resident_name text;

-- Add owner/resident snapshot to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS resident_name text;

-- Backfill existing records from current unit data
UPDATE public.expense_unit_shares s
SET owner_name = u.owner_name, resident_name = u.resident_name
FROM public.units u
WHERE s.unit_id = u.id AND s.owner_name IS NULL;

UPDATE public.unit_charges c
SET owner_name = u.owner_name, resident_name = u.resident_name
FROM public.units u
WHERE c.unit_id = u.id AND c.owner_name IS NULL;

UPDATE public.payments p
SET owner_name = u.owner_name, resident_name = u.resident_name
FROM public.units u
WHERE p.unit_id = u.id AND p.owner_name IS NULL;
