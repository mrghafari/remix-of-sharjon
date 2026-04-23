ALTER TABLE public.building_payment_policies
  ADD COLUMN IF NOT EXISTS late_penalty_auto_apply boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_pay_auto_apply boolean NOT NULL DEFAULT false;