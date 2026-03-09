
-- Fix units policies to be PERMISSIVE
DROP POLICY IF EXISTS "Members can view units" ON public.units;
CREATE POLICY "Members can view units" ON public.units
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can insert units" ON public.units;
CREATE POLICY "Managers can insert units" ON public.units
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can update units" ON public.units;
CREATE POLICY "Managers can update units" ON public.units
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can delete units" ON public.units;
CREATE POLICY "Managers can delete units" ON public.units
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Fix expenses policies
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
CREATE POLICY "Members can view expenses" ON public.expenses
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can insert expenses" ON public.expenses;
CREATE POLICY "Managers can insert expenses" ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can update expenses" ON public.expenses;
CREATE POLICY "Managers can update expenses" ON public.expenses
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can delete expenses" ON public.expenses;
CREATE POLICY "Managers can delete expenses" ON public.expenses
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Fix payments policies
DROP POLICY IF EXISTS "Members can view payments" ON public.payments;
CREATE POLICY "Members can view payments" ON public.payments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can insert payments" ON public.payments;
CREATE POLICY "Managers can insert payments" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can update payments" ON public.payments;
CREATE POLICY "Managers can update payments" ON public.payments
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can delete payments" ON public.payments;
CREATE POLICY "Managers can delete payments" ON public.payments
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Fix managers policies
DROP POLICY IF EXISTS "Members can view managers" ON public.managers;
CREATE POLICY "Members can view managers" ON public.managers
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can insert managers" ON public.managers;
CREATE POLICY "Managers can insert managers" ON public.managers
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can update managers" ON public.managers;
CREATE POLICY "Managers can update managers" ON public.managers
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can delete managers" ON public.managers;
CREATE POLICY "Managers can delete managers" ON public.managers
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Fix building_members policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.building_members;
CREATE POLICY "Users can view their own memberships" ON public.building_members
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage building members" ON public.building_members;
CREATE POLICY "Super admins can manage building members" ON public.building_members
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Managers can view building members" ON public.building_members;
CREATE POLICY "Managers can view building members" ON public.building_members
FOR SELECT TO authenticated
USING (is_building_manager(auth.uid(), building_id));

-- Fix buildings policies
DROP POLICY IF EXISTS "Members can view their buildings" ON public.buildings;
CREATE POLICY "Members can view their buildings" ON public.buildings
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), id));

DROP POLICY IF EXISTS "Managers can update their buildings" ON public.buildings;
CREATE POLICY "Managers can update their buildings" ON public.buildings
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), id));

DROP POLICY IF EXISTS "Managers can delete their buildings" ON public.buildings;
CREATE POLICY "Managers can delete their buildings" ON public.buildings
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), id));

-- Fix category_allocation_settings policies
DROP POLICY IF EXISTS "Members can view category settings" ON public.category_allocation_settings;
CREATE POLICY "Members can view category settings" ON public.category_allocation_settings
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can insert category settings" ON public.category_allocation_settings;
CREATE POLICY "Managers can insert category settings" ON public.category_allocation_settings
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can update category settings" ON public.category_allocation_settings;
CREATE POLICY "Managers can update category settings" ON public.category_allocation_settings
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Fix expense_categories policies
DROP POLICY IF EXISTS "Members can view expense categories" ON public.expense_categories;
CREATE POLICY "Members can view expense categories" ON public.expense_categories
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can insert expense categories" ON public.expense_categories;
CREATE POLICY "Managers can insert expense categories" ON public.expense_categories
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can update expense categories" ON public.expense_categories;
CREATE POLICY "Managers can update expense categories" ON public.expense_categories
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

DROP POLICY IF EXISTS "Managers can delete non-system categories" ON public.expense_categories;
CREATE POLICY "Managers can delete non-system categories" ON public.expense_categories
FOR DELETE TO authenticated
USING ((is_system = false) AND (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id)));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));
