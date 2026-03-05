
-- Add subscription fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_buildings integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_units_per_building integer NOT NULL DEFAULT 10;

-- Function to get all customers with their stats (for super_admin panel)
CREATE OR REPLACE FUNCTION public.get_admin_customers()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  phone text,
  subscription_plan text,
  is_blocked boolean,
  max_buildings integer,
  max_units_per_building integer,
  created_at timestamptz,
  buildings_count bigint,
  total_units bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.user_id,
    u.email::text,
    p.full_name,
    p.phone,
    p.subscription_plan,
    p.is_blocked,
    p.max_buildings,
    p.max_units_per_building,
    p.created_at,
    (SELECT COUNT(*) FROM public.building_members bm WHERE bm.user_id = p.user_id AND bm.role = 'manager') as buildings_count,
    (SELECT COUNT(*) FROM public.units ut 
     JOIN public.building_members bm2 ON bm2.building_id = ut.building_id 
     WHERE bm2.user_id = p.user_id AND bm2.role = 'manager') as total_units
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
  ORDER BY p.created_at DESC
$$;

-- Function to get platform stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE(
  total_users bigint,
  total_buildings bigint,
  total_units bigint,
  blocked_users bigint,
  free_users bigint,
  pro_users bigint,
  enterprise_users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.buildings),
    (SELECT COUNT(*) FROM public.units),
    (SELECT COUNT(*) FROM public.profiles WHERE is_blocked = true),
    (SELECT COUNT(*) FROM public.profiles WHERE subscription_plan = 'free'),
    (SELECT COUNT(*) FROM public.profiles WHERE subscription_plan = 'pro'),
    (SELECT COUNT(*) FROM public.profiles WHERE subscription_plan = 'enterprise')
$$;
