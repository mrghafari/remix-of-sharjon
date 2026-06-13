
ALTER TABLE public.building_meeting_minutes
  ADD COLUMN IF NOT EXISTS is_finalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid;

-- Trigger: clear signatures on content change
CREATE OR REPLACE FUNCTION public.clear_signatures_on_minute_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(OLD.title,'') IS DISTINCT FROM COALESCE(NEW.title,''))
     OR (OLD.meeting_date IS DISTINCT FROM NEW.meeting_date)
     OR (COALESCE(OLD.content,'') IS DISTINCT FROM COALESCE(NEW.content,''))
     OR (COALESCE(OLD.pdf_file_path,'') IS DISTINCT FROM COALESCE(NEW.pdf_file_path,'')) THEN
    DELETE FROM public.meeting_minute_signatures WHERE meeting_minute_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_signatures_on_minute_change ON public.building_meeting_minutes;
CREATE TRIGGER trg_clear_signatures_on_minute_change
BEFORE UPDATE ON public.building_meeting_minutes
FOR EACH ROW EXECUTE FUNCTION public.clear_signatures_on_minute_change();

-- Trigger: block edits to finalized minutes (except finalization flags themselves & by super admin)
CREATE OR REPLACE FUNCTION public.protect_finalized_minute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_finalized = true
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    IF (COALESCE(OLD.title,'') IS DISTINCT FROM COALESCE(NEW.title,''))
       OR (OLD.meeting_date IS DISTINCT FROM NEW.meeting_date)
       OR (COALESCE(OLD.content,'') IS DISTINCT FROM COALESCE(NEW.content,''))
       OR (COALESCE(OLD.pdf_file_path,'') IS DISTINCT FROM COALESCE(NEW.pdf_file_path,'')) THEN
      RAISE EXCEPTION 'صورتجلسه نهایی شده است و قابل ویرایش نیست';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_finalized_minute ON public.building_meeting_minutes;
CREATE TRIGGER trg_protect_finalized_minute
BEFORE UPDATE ON public.building_meeting_minutes
FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_minute();
