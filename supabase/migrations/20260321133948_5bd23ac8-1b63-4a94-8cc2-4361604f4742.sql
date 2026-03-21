CREATE OR REPLACE FUNCTION public.get_admin_customers()
 RETURNS TABLE(user_id uuid, email text, full_name text, phone text, subscription_plan text, is_blocked boolean, max_buildings integer, max_units_per_building integer, created_at timestamp with time zone, buildings_count bigint, total_units bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND EXISTS (
      SELECT 1 FROM public.building_members bm 
      WHERE bm.user_id = p.user_id AND bm.role = 'manager'
    )
  ORDER BY p.created_at DESC
$function$;