
ALTER TABLE public.sms_credit_requests 
  ADD COLUMN IF NOT EXISTS gateway text,
  ADD COLUMN IF NOT EXISTS authority text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ref_id text;

-- Allow status to include 'paid' and 'payment_failed' (text column already, no enum change needed)
