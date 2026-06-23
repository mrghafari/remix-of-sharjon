
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'real_estate_agent';

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS listing_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS property_code text,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS construction_type text,
  ADD COLUMN IF NOT EXISTS building_age integer,
  ADD COLUMN IF NOT EXISTS deal_type text,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS total_floors integer,
  ADD COLUMN IF NOT EXISTS units_per_floor integer,
  ADD COLUMN IF NOT EXISTS document_status text,
  ADD COLUMN IF NOT EXISTS usage_type text,
  ADD COLUMN IF NOT EXISTS property_status text,
  ADD COLUMN IF NOT EXISTS facade text,
  ADD COLUMN IF NOT EXISTS floor_material text,
  ADD COLUMN IF NOT EXISTS kitchen text,
  ADD COLUMN IF NOT EXISTS cabinet text,
  ADD COLUMN IF NOT EXISTS bathroom text,
  ADD COLUMN IF NOT EXISTS storage_area numeric(8,2),
  ADD COLUMN IF NOT EXISTS balcony_area numeric(8,2),
  ADD COLUMN IF NOT EXISTS phone_lines integer,
  ADD COLUMN IF NOT EXISTS max_residents integer,
  ADD COLUMN IF NOT EXISTS loan_amount bigint,
  ADD COLUMN IF NOT EXISTS delivery_time text,
  ADD COLUMN IF NOT EXISTS rent_to_student boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS convertible_rent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS long_term_contract boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_gas boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_cooler boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_radiator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_fan_coil boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_package boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_chiller boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_penthouse boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_elevator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_storage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_balcony boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_fireplace boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_parking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_remote_door boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_pool boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_sauna boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_jacuzzi boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_lobby boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_yard boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_video_intercom boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_security_system boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS listing_description text,
  ADD COLUMN IF NOT EXISTS deposit_rial bigint,
  ADD COLUMN IF NOT EXISTS rent_rial bigint,
  ADD COLUMN IF NOT EXISTS price_per_meter_rial bigint,
  ADD COLUMN IF NOT EXISTS total_price_rial bigint,
  ADD COLUMN IF NOT EXISTS listing_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS units_listing_active_idx ON public.units(listing_active) WHERE listing_active = true;

CREATE TABLE IF NOT EXISTS public.real_estate_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text NOT NULL,
  agency_name text,
  city text,
  national_code text,
  license_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.real_estate_agents TO authenticated;
GRANT ALL ON public.real_estate_agents TO service_role;
ALTER TABLE public.real_estate_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents view own profile" ON public.real_estate_agents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "Agents insert own profile" ON public.real_estate_agents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Agents update own profile" ON public.real_estate_agents FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "Super admin delete agents" ON public.real_estate_agents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_real_estate_agents_updated
  BEFORE UPDATE ON public.real_estate_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.protect_agent_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status
      OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
      OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
      OR OLD.admin_notes IS DISTINCT FROM NEW.admin_notes)
     AND NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN
    NEW.status := OLD.status;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    NEW.admin_notes := OLD.admin_notes;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_agent_status
  BEFORE UPDATE ON public.real_estate_agents
  FOR EACH ROW EXECUTE FUNCTION public.protect_agent_status();

CREATE OR REPLACE FUNCTION public.is_approved_agent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.real_estate_agents
    WHERE user_id = _user_id AND status = 'approved'
  )
$$;

CREATE TABLE IF NOT EXISTS public.unit_listing_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS unit_listing_photos_unit_idx ON public.unit_listing_photos(unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_listing_photos TO authenticated;
GRANT ALL ON public.unit_listing_photos TO service_role;
ALTER TABLE public.unit_listing_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View photos" ON public.unit_listing_photos FOR SELECT TO authenticated
  USING (
    public.is_building_manager(auth.uid(), building_id)
    OR public.is_building_member(auth.uid(), building_id)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
    OR (public.is_approved_agent(auth.uid())
        AND EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND u.listing_active = true))
  );
CREATE POLICY "Insert photos" ON public.unit_listing_photos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_building_manager(auth.uid(), building_id)
    OR public.is_building_member(auth.uid(), building_id)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
  );
CREATE POLICY "Update photos" ON public.unit_listing_photos FOR UPDATE TO authenticated
  USING (
    public.is_building_manager(auth.uid(), building_id)
    OR public.is_building_member(auth.uid(), building_id)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
  );
CREATE POLICY "Delete photos" ON public.unit_listing_photos FOR DELETE TO authenticated
  USING (
    public.is_building_manager(auth.uid(), building_id)
    OR public.is_building_member(auth.uid(), building_id)
    OR public.has_role(auth.uid(),'super_admin'::app_role)
  );

CREATE POLICY "Agents view active unit listings" ON public.units FOR SELECT TO authenticated
  USING (listing_active = true AND public.is_approved_agent(auth.uid()));

CREATE POLICY "Agents view buildings with listings" ON public.buildings FOR SELECT TO authenticated
  USING (
    public.is_approved_agent(auth.uid())
    AND EXISTS (SELECT 1 FROM public.units u WHERE u.building_id = buildings.id AND u.listing_active = true)
  );

CREATE OR REPLACE FUNCTION public.get_admin_agents()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, mobile text, agency_name text,
  city text, national_code text, license_number text, status text,
  admin_notes text, approved_at timestamptz, created_at timestamptz, email text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.user_id, a.full_name, a.mobile, a.agency_name,
         a.city, a.national_code, a.license_number, a.status,
         a.admin_notes, a.approved_at, a.created_at, au.email::text
  FROM public.real_estate_agents a
  LEFT JOIN auth.users au ON au.id = a.user_id
  WHERE public.has_role(auth.uid(),'super_admin'::app_role)
  ORDER BY
    CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
    a.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_update_agent_status(
  _agent_id uuid, _status text, _notes text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF _status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.real_estate_agents
  SET status = _status,
      admin_notes = COALESCE(_notes, admin_notes),
      approved_at = CASE WHEN _status='approved' THEN now() ELSE NULL END,
      approved_by = CASE WHEN _status='approved' THEN auth.uid() ELSE NULL END
  WHERE id = _agent_id
  RETURNING user_id INTO _user_id;
  IF _status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'real_estate_agent'::app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'real_estate_agent'::app_role;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_search_listings(
  _query text DEFAULT NULL,
  _deal_type text DEFAULT NULL,
  _city text DEFAULT NULL,
  _min_area numeric DEFAULT NULL,
  _max_area numeric DEFAULT NULL,
  _min_bedrooms integer DEFAULT NULL,
  _min_price bigint DEFAULT NULL,
  _max_price bigint DEFAULT NULL
) RETURNS TABLE(
  unit_id uuid, building_id uuid, building_name text, address text,
  city text, latitude numeric, longitude numeric,
  unit_number text, area numeric, floor integer, bedrooms integer,
  property_code text, property_type text, deal_type text, direction text,
  property_status text, document_status text,
  deposit_rial bigint, rent_rial bigint, total_price_rial bigint, price_per_meter_rial bigint,
  listing_description text, owner_name text, owner_phone text,
  photo_count bigint, listing_updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, b.id, b.name, b.address, b.city,
         b.latitude, b.longitude,
         u.unit_number, u.area, u.floor, u.bedrooms,
         u.property_code, u.property_type, u.deal_type, u.direction,
         u.property_status, u.document_status,
         u.deposit_rial, u.rent_rial, u.total_price_rial, u.price_per_meter_rial,
         u.listing_description, u.owner_name, u.phone,
         (SELECT COUNT(*) FROM public.unit_listing_photos p WHERE p.unit_id = u.id),
         u.listing_updated_at
  FROM public.units u
  JOIN public.buildings b ON b.id = u.building_id
  WHERE public.is_approved_agent(auth.uid())
    AND u.listing_active = true
    AND (_deal_type IS NULL OR _deal_type = '' OR u.deal_type = _deal_type)
    AND (_city IS NULL OR _city = '' OR b.city ILIKE '%' || _city || '%')
    AND (_min_area IS NULL OR u.area >= _min_area)
    AND (_max_area IS NULL OR u.area <= _max_area)
    AND (_min_bedrooms IS NULL OR u.bedrooms >= _min_bedrooms)
    AND (_min_price IS NULL OR COALESCE(u.total_price_rial, u.rent_rial, u.deposit_rial, 0) >= _min_price)
    AND (_max_price IS NULL OR COALESCE(u.total_price_rial, u.rent_rial, u.deposit_rial, 0) <= _max_price)
    AND (
      _query IS NULL OR _query = '' OR
      u.owner_name ILIKE '%' || _query || '%' OR
      u.resident_name ILIKE '%' || _query || '%' OR
      u.listing_description ILIKE '%' || _query || '%' OR
      u.property_code ILIKE '%' || _query || '%' OR
      b.name ILIKE '%' || _query || '%' OR
      b.address ILIKE '%' || _query || '%' OR
      b.city ILIKE '%' || _query || '%'
    )
  ORDER BY u.listing_updated_at DESC NULLS LAST, u.created_at DESC
  LIMIT 500
$$;
