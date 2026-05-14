CREATE POLICY "Anyone can view pricing plans setting"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (setting_key = 'pricing_plans');