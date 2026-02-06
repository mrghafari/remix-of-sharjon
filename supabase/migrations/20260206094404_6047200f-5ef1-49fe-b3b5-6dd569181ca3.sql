-- Create a new categories table to replace the enum (for dynamic categories)
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '📋',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view expense categories"
ON public.expense_categories
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert expense categories"
ON public.expense_categories
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update expense categories"
ON public.expense_categories
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete non-system categories"
ON public.expense_categories
FOR DELETE USING (is_system = false);

-- Insert existing categories as system categories
INSERT INTO public.expense_categories (name, label, icon, is_system) VALUES
  ('charge', 'شارژ ماهانه', '💰', true),
  ('repair', 'تعمیرات', '🔧', true),
  ('cleaning', 'نظافت', '🧹', true),
  ('elevator', 'آسانسور', '🛗', true),
  ('electricity', 'برق مشاع', '💡', true),
  ('water', 'آب مشاع', '💧', true),
  ('gas', 'گاز مشاع', '🔥', true),
  ('security', 'نگهبانی', '🛡️', true),
  ('parking', 'پارکینگ', '🚗', true),
  ('other', 'سایر', '📋', true);

-- Update category_allocation_settings to reference the new table
-- First add the new column
ALTER TABLE public.category_allocation_settings 
ADD COLUMN category_id uuid REFERENCES public.expense_categories(id) ON DELETE CASCADE;

-- Update existing settings to link to new category table
UPDATE public.category_allocation_settings cas
SET category_id = ec.id
FROM public.expense_categories ec
WHERE cas.category::text = ec.name;

-- Add unique constraint on category_id
ALTER TABLE public.category_allocation_settings
ADD CONSTRAINT category_allocation_settings_category_id_key UNIQUE (category_id);

-- Create function to auto-create allocation settings for new categories
CREATE OR REPLACE FUNCTION public.create_default_allocation_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.category_allocation_settings (category_id, allowed_allocation_types, default_allocation_type)
  VALUES (NEW.id, ARRAY['equal', 'by_area', 'by_residents', 'by_area_residents', 'single_unit']::public.allocation_type[], 'equal');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER create_allocation_settings_on_category_insert
AFTER INSERT ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.create_default_allocation_settings();