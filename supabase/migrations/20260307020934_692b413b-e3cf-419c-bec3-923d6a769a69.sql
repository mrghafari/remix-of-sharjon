
CREATE OR REPLACE FUNCTION public.get_admin_buildings()
RETURNS TABLE(
  id uuid,
  name text,
  address text,
  total_units bigint,
  manager_name text,
  manager_email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    b.id,
    b.name,
    b.address,
    (SELECT COUNT(*) FROM public.units u WHERE u.building_id = b.id) as total_units,
    p.full_name as manager_name,
    au.email::text as manager_email,
    b.created_at
  FROM public.buildings b
  LEFT JOIN public.building_members bm ON bm.building_id = b.id AND bm.role = 'manager'
  LEFT JOIN public.profiles p ON p.user_id = bm.user_id
  LEFT JOIN auth.users au ON au.id = bm.user_id
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
  ORDER BY b.created_at DESC
$$;
