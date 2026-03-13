ALTER TABLE public.buildings
ADD COLUMN vacant_charge_discount_percent integer NOT NULL DEFAULT 0,
ADD COLUMN vacant_extra_charge_discount_percent integer NOT NULL DEFAULT 0;