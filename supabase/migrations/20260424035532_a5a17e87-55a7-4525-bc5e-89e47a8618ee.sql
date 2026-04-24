-- Messages table for direct communication between residents and managers
CREATE TABLE public.building_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL,
  sender_user_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'resident',
  recipient_user_id UUID,
  unit_id UUID,
  subject TEXT,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.building_messages(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_building_messages_building ON public.building_messages(building_id, created_at DESC);
CREATE INDEX idx_building_messages_recipient ON public.building_messages(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX idx_building_messages_sender ON public.building_messages(sender_user_id);

ALTER TABLE public.building_messages ENABLE ROW LEVEL SECURITY;

-- Managers can see/manage all messages in their building
CREATE POLICY "Managers can view building messages"
ON public.building_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can insert messages in their building"
ON public.building_messages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id));

CREATE POLICY "Managers can update messages"
ON public.building_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id) OR sender_user_id = auth.uid() OR recipient_user_id = auth.uid());

CREATE POLICY "Managers or sender can delete messages"
ON public.building_messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR is_building_manager(auth.uid(), building_id) OR sender_user_id = auth.uid());

-- Residents/members can view messages they sent or received
CREATE POLICY "Members can view their own messages"
ON public.building_messages FOR SELECT TO authenticated
USING (
  is_building_member(auth.uid(), building_id)
  AND (sender_user_id = auth.uid() OR recipient_user_id = auth.uid() OR recipient_user_id IS NULL)
);

-- Members can send messages in their building
CREATE POLICY "Members can send messages"
ON public.building_messages FOR INSERT TO authenticated
WITH CHECK (
  is_building_member(auth.uid(), building_id)
  AND sender_user_id = auth.uid()
);

-- Notification reads tracker: which announcements/polls/reservations each user has seen
CREATE TABLE public.notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  building_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'announcement', 'poll', 'reservation', 'message'
  notification_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, notification_id)
);

CREATE INDEX idx_notification_reads_user ON public.notification_reads(user_id, building_id);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reads"
ON public.notification_reads FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reads"
ON public.notification_reads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reads"
ON public.notification_reads FOR DELETE TO authenticated
USING (user_id = auth.uid());