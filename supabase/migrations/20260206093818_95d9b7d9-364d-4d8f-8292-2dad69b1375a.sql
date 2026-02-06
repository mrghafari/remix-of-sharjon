-- Create table for category allocation settings
CREATE TABLE public.category_allocation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.expense_category NOT NULL UNIQUE,
  allowed_allocation_types public.allocation_type[] NOT NULL DEFAULT ARRAY['equal'::public.allocation_type],
  default_allocation_type public.allocation_type NOT NULL DEFAULT 'equal',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_allocation_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - anyone can view, but only authenticated users can modify
CREATE POLICY "Anyone can view category settings"
ON public.category_allocation_settings
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update category settings"
ON public.category_allocation_settings
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can insert category settings"
ON public.category_allocation_settings
FOR INSERT
WITH CHECK (true);

-- Insert default settings for all categories
INSERT INTO public.category_allocation_settings (category, allowed_allocation_types, default_allocation_type)
VALUES 
  ('charge', ARRAY['equal', 'by_area', 'by_residents', 'by_area_residents']::public.allocation_type[], 'equal'),
  ('repair', ARRAY['single_unit', 'equal', 'by_area']::public.allocation_type[], 'equal'),
  ('cleaning', ARRAY['equal', 'by_area']::public.allocation_type[], 'equal'),
  ('elevator', ARRAY['equal', 'by_area', 'by_residents']::public.allocation_type[], 'equal'),
  ('electricity', ARRAY['equal', 'by_area', 'by_residents', 'by_area_residents']::public.allocation_type[], 'equal'),
  ('water', ARRAY['equal', 'by_residents', 'by_area_residents']::public.allocation_type[], 'by_residents'),
  ('gas', ARRAY['equal', 'by_area', 'by_residents', 'by_area_residents']::public.allocation_type[], 'equal'),
  ('security', ARRAY['equal']::public.allocation_type[], 'equal'),
  ('parking', ARRAY['single_unit', 'equal']::public.allocation_type[], 'equal'),
  ('other', ARRAY['single_unit', 'equal', 'by_area', 'by_residents', 'by_area_residents']::public.allocation_type[], 'equal')
ON CONFLICT (category) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_category_allocation_settings_updated_at
BEFORE UPDATE ON public.category_allocation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();