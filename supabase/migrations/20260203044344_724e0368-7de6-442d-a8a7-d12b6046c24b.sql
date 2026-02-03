-- Create allocation type enum
CREATE TYPE public.allocation_type AS ENUM (
  'single_unit',      -- فقط واحد مربوطه
  'by_area',          -- بر اساس متراژ
  'by_residents',     -- بر اساس نفرات
  'by_area_residents', -- متراژ و نفرات با نسبت
  'equal'             -- به نسبت مساوی
);

-- Add allocation columns to expenses table
ALTER TABLE public.expenses 
ADD COLUMN allocation_type public.allocation_type NOT NULL DEFAULT 'equal',
ADD COLUMN area_ratio numeric DEFAULT 50 CHECK (area_ratio >= 0 AND area_ratio <= 100);