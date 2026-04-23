ALTER TABLE public.building_bank_accounts
ADD COLUMN is_rejected BOOLEAN NOT NULL DEFAULT false;

-- Update trigger to handle rejection field protection
CREATE OR REPLACE FUNCTION public.protect_bank_account_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If approval/rejection status is changing and user is not super admin, block it
  IF (OLD.is_approved IS DISTINCT FROM NEW.is_approved 
      OR OLD.is_rejected IS DISTINCT FROM NEW.is_rejected
      OR OLD.approved_at IS DISTINCT FROM NEW.approved_at 
      OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
      OR OLD.admin_notes IS DISTINCT FROM NEW.admin_notes)
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    NEW.is_approved := OLD.is_approved;
    NEW.is_rejected := OLD.is_rejected;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    NEW.admin_notes := OLD.admin_notes;
  END IF;
  
  -- Only one active account per building
  IF NEW.is_active = true AND NEW.is_approved = true THEN
    UPDATE public.building_bank_accounts
    SET is_active = false
    WHERE building_id = NEW.building_id
      AND id <> NEW.id
      AND is_active = true;
  END IF;
  
  -- Cannot be active if not approved or if rejected
  IF NEW.is_active = true AND (NEW.is_approved = false OR NEW.is_rejected = true) THEN
    NEW.is_active := false;
  END IF;
  
  -- If approved, clear rejected flag
  IF NEW.is_approved = true THEN
    NEW.is_rejected := false;
  END IF;
  
  RETURN NEW;
END;
$$;