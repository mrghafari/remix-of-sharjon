-- Table for SMS packages managed by super admin
CREATE TABLE public.sms_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_count integer NOT NULL,
  price numeric NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_packages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active packages (managers need to see them)
CREATE POLICY "Authenticated can view sms packages"
  ON public.sms_packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert sms packages"
  ON public.sms_packages FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update sms packages"
  ON public.sms_packages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete sms packages"
  ON public.sms_packages FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_sms_packages_updated_at
  BEFORE UPDATE ON public.sms_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default packages
INSERT INTO public.sms_packages (package_count, price, sort_order) VALUES
  (1000, 150000, 1),
  (5000, 700000, 2),
  (10000, 1300000, 3),
  (20000, 2400000, 4),
  (50000, 5500000, 5);

-- Allow super admins to view all credit requests across all buildings
CREATE POLICY "Super admins can view all credit requests"
  ON public.sms_credit_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));