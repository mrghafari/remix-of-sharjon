
-- Allow super_admins to update any profile (for plan/block management)
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));
