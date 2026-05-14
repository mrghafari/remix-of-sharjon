-- 1) Add snapshot columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS manager_name text;

ALTER TABLE public.expense_unit_shares
  ADD COLUMN IF NOT EXISTS manager_name text;

-- 2) Helper function: returns the active "main" manager's display name at a given date.
--    Falls back to any active manager if no 'main' role exists.
CREATE OR REPLACE FUNCTION public.get_manager_name_at(_building_id uuid, _on_date date)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    m.external_name,
    CASE WHEN m.role_type = 'owner' THEN u.owner_name
         ELSE COALESCE(u.resident_name, u.owner_name) END
  )
  FROM public.managers m
  LEFT JOIN public.units u ON u.id = m.unit_id
  LEFT JOIN public.manager_roles mr ON mr.id = m.role_id
  WHERE m.building_id = _building_id
    AND m.start_date <= _on_date
    AND (m.end_date IS NULL OR m.end_date >= _on_date)
  ORDER BY
    CASE WHEN mr.name = 'main' THEN 0 ELSE 1 END,
    COALESCE(mr.sort_order, 999),
    m.start_date DESC
  LIMIT 1
$$;

-- 3) Triggers to auto-populate manager_name on insert
CREATE OR REPLACE FUNCTION public.set_payment_manager_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.manager_name IS NULL OR NEW.manager_name = '' THEN
    NEW.manager_name := public.get_manager_name_at(NEW.building_id, COALESCE(NEW.payment_date, CURRENT_DATE));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_expense_share_manager_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exp_date date;
BEGIN
  IF NEW.manager_name IS NULL OR NEW.manager_name = '' THEN
    SELECT expense_date INTO _exp_date FROM public.expenses WHERE id = NEW.expense_id;
    NEW.manager_name := public.get_manager_name_at(NEW.building_id, COALESCE(_exp_date, CURRENT_DATE));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_payment_manager_name ON public.payments;
CREATE TRIGGER trg_set_payment_manager_name
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_payment_manager_name();

DROP TRIGGER IF EXISTS trg_set_expense_share_manager_name ON public.expense_unit_shares;
CREATE TRIGGER trg_set_expense_share_manager_name
BEFORE INSERT ON public.expense_unit_shares
FOR EACH ROW EXECUTE FUNCTION public.set_expense_share_manager_name();

-- 4) Backfill existing records
UPDATE public.payments p
SET manager_name = public.get_manager_name_at(p.building_id, p.payment_date)
WHERE p.manager_name IS NULL;

UPDATE public.expense_unit_shares s
SET manager_name = public.get_manager_name_at(
  s.building_id,
  COALESCE((SELECT e.expense_date FROM public.expenses e WHERE e.id = s.expense_id), CURRENT_DATE)
)
WHERE s.manager_name IS NULL;