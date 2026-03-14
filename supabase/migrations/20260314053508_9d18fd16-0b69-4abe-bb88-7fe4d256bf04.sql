
-- Add default charge amounts to buildings table
ALTER TABLE public.buildings 
  ADD COLUMN IF NOT EXISTS default_charge_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_extra_charge_amount numeric NOT NULL DEFAULT 0;

-- Create unit_charges table for direct unit debts
CREATE TABLE public.unit_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  fund_type public.fund_type NOT NULL DEFAULT 'charge',
  month integer NOT NULL,
  year integer NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unit_charges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Managers can insert unit charges"
  ON public.unit_charges FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update unit charges"
  ON public.unit_charges FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete unit charges"
  ON public.unit_charges FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Members can view unit charges"
  ON public.unit_charges FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));
