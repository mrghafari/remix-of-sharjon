
ALTER TABLE public.building_online_meetings
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS excluded_owner_unit_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_resident_unit_ids uuid[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT building_online_meetings_audience_check
    CHECK (audience IN ('owners','residents','both'));
