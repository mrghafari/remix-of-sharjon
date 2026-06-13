ALTER TABLE public.building_online_meetings 
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS has_online boolean NOT NULL DEFAULT true;

ALTER TABLE public.building_online_meetings ALTER COLUMN room_name DROP NOT NULL;
ALTER TABLE public.building_online_meetings ALTER COLUMN jitsi_domain DROP NOT NULL;