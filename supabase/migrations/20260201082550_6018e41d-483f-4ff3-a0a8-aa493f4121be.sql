-- Add fund_type column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN fund_type public.fund_type NOT NULL DEFAULT 'charge';