
CREATE TABLE public.building_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  specialty text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.building_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contacts" ON public.building_contacts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert contacts" ON public.building_contacts
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update contacts" ON public.building_contacts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete contacts" ON public.building_contacts
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));
