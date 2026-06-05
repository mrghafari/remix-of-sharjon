ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reconciled_at timestamptz NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reconciled_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_payments_reconciled ON public.payments (building_id, reconciled_at);
CREATE INDEX IF NOT EXISTS idx_expenses_reconciled ON public.expenses (building_id, reconciled_at);