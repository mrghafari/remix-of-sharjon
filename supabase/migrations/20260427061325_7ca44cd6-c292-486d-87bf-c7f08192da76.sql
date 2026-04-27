CREATE TABLE public.sms_credit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  package_count integer NOT NULL,
  manager_note text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view their building requests"
ON public.sms_credit_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can insert requests for their building"
ON public.sms_credit_requests FOR INSERT
TO authenticated
WITH CHECK ((has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id)) AND requested_by = auth.uid());

CREATE POLICY "Super admins can update requests"
ON public.sms_credit_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete requests"
ON public.sms_credit_requests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_sms_credit_requests_updated_at
BEFORE UPDATE ON public.sms_credit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sms_credit_requests_building ON public.sms_credit_requests(building_id);
CREATE INDEX idx_sms_credit_requests_status ON public.sms_credit_requests(status);