
-- Create meeting minutes table
CREATE TABLE public.building_meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_date date NOT NULL,
  content text,
  pdf_file_path text,
  pdf_file_name text,
  pdf_file_size bigint DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_minutes_building ON public.building_meeting_minutes(building_id, meeting_date DESC);
CREATE INDEX idx_meeting_minutes_content ON public.building_meeting_minutes USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')));

ALTER TABLE public.building_meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view meeting minutes"
  ON public.building_meeting_minutes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert meeting minutes"
  ON public.building_meeting_minutes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update meeting minutes"
  ON public.building_meeting_minutes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete meeting minutes"
  ON public.building_meeting_minutes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE TRIGGER update_meeting_minutes_updated_at
  BEFORE UPDATE ON public.building_meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-minutes', 'meeting-minutes', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members can read meeting minutes files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meeting-minutes' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    is_building_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  ));

CREATE POLICY "Managers can upload meeting minutes files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meeting-minutes' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
  ));

CREATE POLICY "Managers can delete meeting minutes files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meeting-minutes' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    is_building_manager(auth.uid(), ((storage.foldername(name))[1])::uuid)
  ));
