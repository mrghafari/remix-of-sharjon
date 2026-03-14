
-- Storage bucket for expense attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-attachments', 'expense-attachments', true);

-- Expense attachments table
CREATE TABLE public.expense_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense attachments" ON public.expense_attachments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_member(auth.uid(), building_id));

CREATE POLICY "Managers can insert expense attachments" ON public.expense_attachments
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can delete expense attachments" ON public.expense_attachments
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

-- Storage RLS
CREATE POLICY "Authenticated users can upload expense attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expense-attachments');

CREATE POLICY "Anyone can view expense attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'expense-attachments');

CREATE POLICY "Authenticated users can delete expense attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expense-attachments');
