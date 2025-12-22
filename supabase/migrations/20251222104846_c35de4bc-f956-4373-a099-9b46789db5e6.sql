-- Create expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'charge',
  'repair',
  'cleaning',
  'water',
  'electricity',
  'gas',
  'elevator',
  'parking',
  'security',
  'other'
);

-- Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_number TEXT NOT NULL UNIQUE,
  owner_name TEXT NOT NULL,
  phone TEXT,
  area NUMERIC(10, 2),
  floor INTEGER,
  is_occupied BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC(15, 0) NOT NULL,
  category expense_category NOT NULL DEFAULT 'other',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_paid BOOLEAN DEFAULT false,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table for charge tracking
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  amount NUMERIC(15, 0) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create public read policies (building data is shared)
CREATE POLICY "Anyone can view units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Anyone can insert units" ON public.units FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update units" ON public.units FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete units" ON public.units FOR DELETE USING (true);

CREATE POLICY "Anyone can view expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete expenses" ON public.expenses FOR DELETE USING (true);

CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete payments" ON public.payments FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample units
INSERT INTO public.units (unit_number, owner_name, phone, area, floor, is_occupied) VALUES
  ('۱۰۱', 'علی احمدی', '۰۹۱۲۱۲۳۴۵۶۷', 85, 1, true),
  ('۱۰۲', 'محمد رضایی', '۰۹۱۲۲۳۴۵۶۷۸', 95, 1, true),
  ('۲۰۱', 'حسین کریمی', '۰۹۱۲۳۴۵۶۷۸۹', 85, 2, true),
  ('۲۰۲', 'رضا محمدی', '۰۹۱۲۴۵۶۷۸۹۰', 95, 2, false),
  ('۳۰۱', 'احمد علوی', '۰۹۱۲۵۶۷۸۹۰۱', 100, 3, true),
  ('۳۰۲', 'مهدی حسینی', '۰۹۱۲۶۷۸۹۰۱۲', 110, 3, true);