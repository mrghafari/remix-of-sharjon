
CREATE TABLE public.unit_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  person_type text NOT NULL CHECK (person_type IN ('owner','resident','both')),
  module_key text NOT NULL CHECK (module_key IN ('all_expenses','fund_balances')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid
);

CREATE UNIQUE INDEX unit_module_access_unique
  ON public.unit_module_access (building_id, unit_id, person_type, module_key);

CREATE INDEX unit_module_access_building_idx
  ON public.unit_module_access (building_id, unit_id);

ALTER TABLE public.unit_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can insert module access"
  ON public.unit_module_access FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update module access"
  ON public.unit_module_access FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete module access"
  ON public.unit_module_access FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Members can view module access"
  ON public.unit_module_access FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));
