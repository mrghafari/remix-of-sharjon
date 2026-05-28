-- Convert all stored monetary amounts from Toman to Rial (×10)
UPDATE public.expenses SET amount = amount * 10;
UPDATE public.payments SET amount = amount * 10;
UPDATE public.unit_charges SET amount = amount * 10;
UPDATE public.expense_unit_shares SET allocated_amount = allocated_amount * 10;
UPDATE public.projects SET budget = budget * 10 WHERE budget IS NOT NULL;
UPDATE public.utility_readings SET amount = amount * 10 WHERE amount IS NOT NULL;
UPDATE public.sms_credit_requests SET amount = amount * 10 WHERE amount IS NOT NULL;
UPDATE public.sms_packages SET price = price * 10 WHERE price IS NOT NULL;
UPDATE public.buildings SET 
  default_charge_amount = default_charge_amount * 10,
  default_extra_charge_amount = default_extra_charge_amount * 10;

-- Update defaults for new buildings
ALTER TABLE public.buildings ALTER COLUMN default_charge_amount SET DEFAULT 5000000;
ALTER TABLE public.buildings ALTER COLUMN default_extra_charge_amount SET DEFAULT 2000000;

-- Convert opening balance amounts if those tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='opening_balances') THEN
    EXECUTE 'UPDATE public.opening_balances SET amount = amount * 10 WHERE amount IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='unit_opening_balances') THEN
    EXECUTE 'UPDATE public.unit_opening_balances SET amount = amount * 10 WHERE amount IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='building_opening_balances') THEN
    EXECUTE 'UPDATE public.building_opening_balances SET amount = amount * 10 WHERE amount IS NOT NULL';
  END IF;
END $$;

-- Projects visibility to residents (manager-controlled)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_visible_to_residents boolean NOT NULL DEFAULT true;