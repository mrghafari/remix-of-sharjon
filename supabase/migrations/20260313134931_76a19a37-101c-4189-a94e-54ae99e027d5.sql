ALTER TABLE public.projects
ADD COLUMN manager_charge_discount_percent integer NOT NULL DEFAULT 0,
ADD COLUMN manager_extra_charge_discount_percent integer NOT NULL DEFAULT 0;