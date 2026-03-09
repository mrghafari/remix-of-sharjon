
-- Fix unique constraint to be per-building, not global
ALTER TABLE public.expense_categories DROP CONSTRAINT expense_categories_name_key;
ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_building_name_key UNIQUE (building_id, name);
