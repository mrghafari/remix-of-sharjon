-- Enums
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'answered', 'closed');
CREATE TYPE public.ticket_category AS ENUM ('financial', 'technical', 'support', 'other');

-- Tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  creator_name text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  category public.ticket_category NOT NULL DEFAULT 'support',
  status public.ticket_status NOT NULL DEFAULT 'open',
  last_reply_at timestamptz NOT NULL DEFAULT now(),
  last_reply_by_role text NOT NULL DEFAULT 'manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view their building tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can create tickets for their building"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id))
  AND created_by = auth.uid()
);

CREATE POLICY "Managers and admins can update tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Super admins and creators can delete tickets"
ON public.support_tickets FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR created_by = auth.uid());

CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ticket messages
CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  building_id uuid NOT NULL,
  sender_user_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_role text NOT NULL,
  content text NOT NULL,
  attachment_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket participants can view messages"
ON public.support_ticket_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_building_manager(auth.uid(), building_id)
);

CREATE POLICY "Ticket participants can send messages"
ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id))
);

CREATE POLICY "Participants can mark messages as read"
ON public.support_ticket_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Sender or admin can delete messages"
ON public.support_ticket_messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR sender_user_id = auth.uid());

CREATE INDEX idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);
CREATE INDEX idx_tickets_building ON public.support_tickets(building_id, status);

-- Storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Users can delete their own ticket attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);