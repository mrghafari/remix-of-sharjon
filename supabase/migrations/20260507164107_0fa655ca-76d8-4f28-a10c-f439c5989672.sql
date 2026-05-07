
CREATE TABLE public.building_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.building_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rules"
ON public.building_rules FOR SELECT TO authenticated
USING (has_role(auth.uid(),'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert rules"
ON public.building_rules FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update rules"
ON public.building_rules FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete rules"
ON public.building_rules FOR DELETE TO authenticated
USING (has_role(auth.uid(),'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE TRIGGER update_building_rules_updated_at
BEFORE UPDATE ON public.building_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
