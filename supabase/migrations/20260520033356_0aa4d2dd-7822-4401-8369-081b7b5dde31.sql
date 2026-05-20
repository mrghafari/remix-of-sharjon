ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS auto_charge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_charge_day integer NOT NULL DEFAULT 1;

ALTER TABLE public.buildings
  ADD CONSTRAINT buildings_auto_charge_day_check
  CHECK (auto_charge_day BETWEEN 1 AND 31);