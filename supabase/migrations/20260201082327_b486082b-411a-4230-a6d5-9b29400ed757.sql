-- Create enum for fund types
CREATE TYPE public.fund_type AS ENUM ('charge', 'extra_charge');

-- Add fund_type column to payments table
ALTER TABLE public.payments 
ADD COLUMN fund_type public.fund_type NOT NULL DEFAULT 'charge';