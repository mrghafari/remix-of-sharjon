
-- Create storage bucket for building documents
INSERT INTO storage.buckets (id, name, public) VALUES ('building-documents', 'building-documents', false);

-- Create documents metadata table with folder support
CREATE TABLE public.building_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  folder text NOT NULL DEFAULT 'عمومی',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL
);

ALTER TABLE public.building_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view building documents"
  ON public.building_documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert building documents"
  ON public.building_documents FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete building documents"
  ON public.building_documents FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Storage RLS policies
CREATE POLICY "Members can view building files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'building-documents' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    is_building_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  ));

CREATE POLICY "Managers can upload building files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'building-documents' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    is_building_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  ));

CREATE POLICY "Managers can delete building files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'building-documents' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    is_building_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  ));
