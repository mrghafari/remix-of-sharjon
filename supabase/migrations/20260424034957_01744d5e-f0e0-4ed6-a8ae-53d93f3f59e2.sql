-- Table to track which units have document access REVOKED (default = all have access)
CREATE TABLE public.unit_document_access_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  blocked_by uuid,
  UNIQUE(building_id, unit_id)
);

ALTER TABLE public.unit_document_access_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view document access blocks"
  ON public.unit_document_access_blocks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert document access blocks"
  ON public.unit_document_access_blocks FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete document access blocks"
  ON public.unit_document_access_blocks FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));