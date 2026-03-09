
-- Create trigger function to auto-create default expense categories for new buildings
CREATE OR REPLACE FUNCTION public.create_default_expense_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.expense_categories (building_id, name, label, icon, is_system) VALUES
    (NEW.id, 'charge', 'شارژ ماهانه', '💰', true),
    (NEW.id, 'repair', 'تعمیرات', '🔧', true),
    (NEW.id, 'cleaning', 'نظافت', '🧹', true),
    (NEW.id, 'elevator', 'آسانسور', '🛗', true),
    (NEW.id, 'electricity', 'برق مشاع', '💡', true),
    (NEW.id, 'water', 'آب مشاع', '💧', true),
    (NEW.id, 'gas', 'گاز مشاع', '🔥', true),
    (NEW.id, 'security', 'نگهبانی', '🛡️', true),
    (NEW.id, 'parking', 'پارکینگ', '🚗', true),
    (NEW.id, 'other', 'سایر', '📋', true);
  RETURN NEW;
END;
$$;

-- Create trigger on buildings table
DROP TRIGGER IF EXISTS on_building_created_categories ON public.buildings;
CREATE TRIGGER on_building_created_categories
  AFTER INSERT ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_expense_categories();
