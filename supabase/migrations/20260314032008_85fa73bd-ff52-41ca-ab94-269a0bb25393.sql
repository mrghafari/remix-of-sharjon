
-- Table to store snapshotted expense allocations per unit
CREATE TABLE public.expense_unit_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  allocated_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(expense_id, unit_id)
);

-- Enable RLS
ALTER TABLE public.expense_unit_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view expense shares"
  ON public.expense_unit_shares FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert expense shares"
  ON public.expense_unit_shares FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update expense shares"
  ON public.expense_unit_shares FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete expense shares"
  ON public.expense_unit_shares FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Index for fast lookups
CREATE INDEX idx_expense_unit_shares_expense ON public.expense_unit_shares(expense_id);
CREATE INDEX idx_expense_unit_shares_unit ON public.expense_unit_shares(unit_id);
CREATE INDEX idx_expense_unit_shares_building ON public.expense_unit_shares(building_id);
