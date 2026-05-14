ALTER TABLE public.unit_document_access_blocks
  ADD COLUMN IF NOT EXISTS folder text;

ALTER TABLE public.unit_document_access_blocks
  DROP CONSTRAINT IF EXISTS unit_document_access_blocks_unique_per_person;

CREATE UNIQUE INDEX IF NOT EXISTS unit_doc_access_blocks_unique_idx
  ON public.unit_document_access_blocks
  (building_id, unit_id, person_type, COALESCE(folder, ''));