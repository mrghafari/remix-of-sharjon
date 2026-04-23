-- 1) Create manager_roles table
CREATE TABLE public.manager_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id uuid NOT NULL,
  name text NOT NULL,
  label text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(building_id, name)
);

ALTER TABLE public.manager_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view manager roles"
ON public.manager_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert manager roles"
ON public.manager_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update manager roles"
ON public.manager_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete non-system manager roles"
ON public.manager_roles FOR DELETE TO authenticated
USING (is_system = false AND (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id)));

CREATE TRIGGER update_manager_roles_updated_at
BEFORE UPDATE ON public.manager_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Add role_id to managers
ALTER TABLE public.managers
ADD COLUMN role_id uuid REFERENCES public.manager_roles(id) ON DELETE SET NULL;

CREATE INDEX idx_managers_role_id ON public.managers(role_id);

-- 3) Function + trigger to seed default roles for each new building
CREATE OR REPLACE FUNCTION public.create_default_manager_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.manager_roles (building_id, name, label, is_system, sort_order) VALUES
    (NEW.id, 'main', 'مدیر اصلی', true, 1),
    (NEW.id, 'deputy', 'مدیر علی‌البدل', true, 2),
    (NEW.id, 'accountant', 'حسابدار', true, 3),
    (NEW.id, 'executive', 'مدیر اجرایی', true, 4);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_building_created_manager_roles
AFTER INSERT ON public.buildings
FOR EACH ROW EXECUTE FUNCTION public.create_default_manager_roles();

-- 4) Backfill default roles for existing buildings
INSERT INTO public.manager_roles (building_id, name, label, is_system, sort_order)
SELECT b.id, r.name, r.label, true, r.sort_order
FROM public.buildings b
CROSS JOIN (VALUES
  ('main', 'مدیر اصلی', 1),
  ('deputy', 'مدیر علی‌البدل', 2),
  ('accountant', 'حسابدار', 3),
  ('executive', 'مدیر اجرایی', 4)
) AS r(name, label, sort_order)
ON CONFLICT (building_id, name) DO NOTHING;

-- 5) Backfill role_id = 'main' for existing active managers
UPDATE public.managers m
SET role_id = mr.id
FROM public.manager_roles mr
WHERE mr.building_id = m.building_id
  AND mr.name = 'main'
  AND m.role_id IS NULL
  AND m.is_active = true;