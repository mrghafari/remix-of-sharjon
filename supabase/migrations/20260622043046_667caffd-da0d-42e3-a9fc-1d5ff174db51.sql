
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS charge_allocation_type text NOT NULL DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS extra_charge_allocation_type text NOT NULL DEFAULT 'equal',
  ADD COLUMN IF NOT EXISTS charge_area_ratio integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS extra_charge_area_ratio integer NOT NULL DEFAULT 50;

ALTER TABLE public.buildings
  ADD CONSTRAINT buildings_charge_allocation_type_chk
  CHECK (charge_allocation_type IN ('equal','by_area','by_residents','by_area_residents'));

ALTER TABLE public.buildings
  ADD CONSTRAINT buildings_extra_charge_allocation_type_chk
  CHECK (extra_charge_allocation_type IN ('equal','by_area','by_residents','by_area_residents'));
