
-- ============================================
-- Phase 1.3: Role-based RLS policies
-- ============================================

-- ===================== BUILDINGS =====================
DROP POLICY IF EXISTS "Anyone can view buildings" ON public.buildings;
DROP POLICY IF EXISTS "Anyone can insert buildings" ON public.buildings;
DROP POLICY IF EXISTS "Anyone can update buildings" ON public.buildings;
DROP POLICY IF EXISTS "Anyone can delete buildings" ON public.buildings;

-- Any authenticated user can view buildings they are a member of
CREATE POLICY "Members can view their buildings"
  ON public.buildings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_member(auth.uid(), id)
  );

-- Any authenticated user can create a building
CREATE POLICY "Authenticated users can create buildings"
  ON public.buildings FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only managers or super_admins can update buildings
CREATE POLICY "Managers can update their buildings"
  ON public.buildings FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), id)
  );

-- Only super_admins or managers can delete buildings
CREATE POLICY "Managers can delete their buildings"
  ON public.buildings FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), id)
  );

-- ===================== UNITS =====================
DROP POLICY IF EXISTS "Anyone can view units" ON public.units;
DROP POLICY IF EXISTS "Anyone can insert units" ON public.units;
DROP POLICY IF EXISTS "Anyone can update units" ON public.units;
DROP POLICY IF EXISTS "Anyone can delete units" ON public.units;

CREATE POLICY "Members can view units"
  ON public.units FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_member(auth.uid(), building_id)
  );

CREATE POLICY "Managers can insert units"
  ON public.units FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can update units"
  ON public.units FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can delete units"
  ON public.units FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

-- ===================== EXPENSES =====================
DROP POLICY IF EXISTS "Anyone can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can delete expenses" ON public.expenses;

CREATE POLICY "Members can view expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_member(auth.uid(), building_id)
  );

CREATE POLICY "Managers can insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

-- ===================== PAYMENTS =====================
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can update payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can delete payments" ON public.payments;

CREATE POLICY "Members can view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_member(auth.uid(), building_id)
  );

CREATE POLICY "Managers can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

-- ===================== MANAGERS =====================
DROP POLICY IF EXISTS "Anyone can view managers" ON public.managers;
DROP POLICY IF EXISTS "Anyone can insert managers" ON public.managers;
DROP POLICY IF EXISTS "Anyone can update managers" ON public.managers;
DROP POLICY IF EXISTS "Anyone can delete managers" ON public.managers;

CREATE POLICY "Members can view managers"
  ON public.managers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_member(auth.uid(), building_id)
  );

CREATE POLICY "Managers can insert managers"
  ON public.managers FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can update managers"
  ON public.managers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can delete managers"
  ON public.managers FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

-- ===================== EXPENSE_CATEGORIES =====================
DROP POLICY IF EXISTS "Anyone can view expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Anyone can insert expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Anyone can update expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Anyone can delete non-system categories" ON public.expense_categories;

CREATE POLICY "Members can view expense categories"
  ON public.expense_categories FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_member(auth.uid(), building_id)
  );

CREATE POLICY "Managers can insert expense categories"
  ON public.expense_categories FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can update expense categories"
  ON public.expense_categories FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can delete non-system categories"
  ON public.expense_categories FOR DELETE TO authenticated
  USING (
    is_system = false
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.is_building_manager(auth.uid(), building_id)
    )
  );

-- ===================== CATEGORY_ALLOCATION_SETTINGS =====================
DROP POLICY IF EXISTS "Anyone can view category settings" ON public.category_allocation_settings;
DROP POLICY IF EXISTS "Anyone can insert category settings" ON public.category_allocation_settings;
DROP POLICY IF EXISTS "Anyone can update category settings" ON public.category_allocation_settings;

CREATE POLICY "Members can view category settings"
  ON public.category_allocation_settings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_member(auth.uid(), building_id)
  );

CREATE POLICY "Managers can insert category settings"
  ON public.category_allocation_settings FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

CREATE POLICY "Managers can update category settings"
  ON public.category_allocation_settings FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.is_building_manager(auth.uid(), building_id)
  );

-- ===================== AUTO-ADD BUILDING CREATOR =====================
-- Trigger to automatically add building creator as manager member
CREATE OR REPLACE FUNCTION public.handle_new_building()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.building_members (user_id, building_id, role)
  VALUES (auth.uid(), NEW.id, 'manager');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_building_created
  AFTER INSERT ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_building();
