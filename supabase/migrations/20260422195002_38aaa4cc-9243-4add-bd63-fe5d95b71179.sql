-- Building-level payment policies (early-pay discount & late penalty)
CREATE TABLE public.building_payment_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL UNIQUE,

  -- Good payer (early payment) discount
  early_pay_enabled BOOLEAN NOT NULL DEFAULT false,
  early_pay_days INTEGER NOT NULL DEFAULT 7,
  early_pay_discount_percent NUMERIC NOT NULL DEFAULT 0,

  -- Late payment penalty
  late_penalty_enabled BOOLEAN NOT NULL DEFAULT false,
  late_grace_days INTEGER NOT NULL DEFAULT 30,
  late_penalty_percent_per_month NUMERIC NOT NULL DEFAULT 0,
  late_penalty_max_months INTEGER NOT NULL DEFAULT 12,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.building_payment_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payment policies"
ON public.building_payment_policies
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert payment policies"
ON public.building_payment_policies
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update payment policies"
ON public.building_payment_policies
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete payment policies"
ON public.building_payment_policies
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE TRIGGER update_building_payment_policies_updated_at
BEFORE UPDATE ON public.building_payment_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();