
-- =========================================================
-- 1. subscription_plans
-- =========================================================
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit_quota integer NOT NULL CHECK (unit_quota > 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  price_rial bigint NOT NULL CHECK (price_rial >= 0),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans readable by all"
  ON public.subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Super admins manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. customer_subscriptions
-- =========================================================
CREATE TABLE public.customer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  unit_quota integer NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_subscriptions_user ON public.customer_subscriptions(user_id, is_active, expires_at DESC);

GRANT SELECT ON public.customer_subscriptions TO authenticated;
GRANT ALL ON public.customer_subscriptions TO service_role;

ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions"
  ON public.customer_subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage subscriptions"
  ON public.customer_subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_customer_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. subscription_payments
-- =========================================================
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.customer_subscriptions(id) ON DELETE SET NULL,
  amount_rial bigint NOT NULL CHECK (amount_rial >= 0),
  gateway text NOT NULL DEFAULT 'zarinpal',
  authority text,
  ref_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','canceled')),
  payment_date timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_user ON public.subscription_payments(user_id, created_at DESC);
CREATE INDEX idx_subscription_payments_status ON public.subscription_payments(status, payment_date DESC);

GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments"
  ON public.subscription_payments FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins manage payments"
  ON public.subscription_payments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_subscription_payments_updated_at
  BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. RPCs
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE(
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  unit_quota integer,
  units_used bigint,
  starts_at timestamptz,
  expires_at timestamptz,
  days_remaining integer,
  is_active boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    cs.id,
    cs.plan_id,
    sp.name,
    cs.unit_quota,
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.units u
      JOIN public.building_members bm ON bm.building_id = u.building_id
      WHERE bm.user_id = auth.uid() AND bm.role = 'manager'
    ), 0),
    cs.starts_at,
    cs.expires_at,
    GREATEST(0, EXTRACT(DAY FROM (cs.expires_at - now()))::int),
    (cs.is_active AND cs.expires_at > now())
  FROM public.customer_subscriptions cs
  LEFT JOIN public.subscription_plans sp ON sp.id = cs.plan_id
  WHERE cs.user_id = auth.uid()
  ORDER BY cs.expires_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_admin_subscription_overview()
RETURNS TABLE(
  user_id uuid,
  unit_quota integer,
  units_used bigint,
  expires_at timestamptz,
  days_remaining integer,
  is_active boolean,
  total_paid bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.user_id,
    COALESCE(cs.unit_quota, 0),
    COALESCE((
      SELECT COUNT(*)::bigint FROM public.units u
      JOIN public.building_members bm ON bm.building_id = u.building_id
      WHERE bm.user_id = p.user_id AND bm.role = 'manager'
    ), 0),
    cs.expires_at,
    CASE WHEN cs.expires_at IS NULL THEN 0
         ELSE GREATEST(0, EXTRACT(DAY FROM (cs.expires_at - now()))::int) END,
    COALESCE(cs.is_active AND cs.expires_at > now(), false),
    COALESCE((
      SELECT SUM(amount_rial)::bigint FROM public.subscription_payments
      WHERE user_id = p.user_id AND status = 'paid'
    ), 0)
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT * FROM public.customer_subscriptions
    WHERE user_id = p.user_id
    ORDER BY expires_at DESC LIMIT 1
  ) cs ON true
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.get_company_revenue(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(
  total_revenue bigint,
  total_payments bigint,
  active_subscriptions bigint,
  this_month_revenue bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT SUM(amount_rial)::bigint FROM public.subscription_payments
              WHERE status='paid'
                AND (_from IS NULL OR payment_date >= _from)
                AND (_to IS NULL OR payment_date <= _to)), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.subscription_payments
              WHERE status='paid'
                AND (_from IS NULL OR payment_date >= _from)
                AND (_to IS NULL OR payment_date <= _to)), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.customer_subscriptions
              WHERE is_active AND expires_at > now()), 0),
    COALESCE((SELECT SUM(amount_rial)::bigint FROM public.subscription_payments
              WHERE status='paid' AND payment_date >= date_trunc('month', now())), 0)
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
$$;

-- =========================================================
-- 5. Quota enforcement trigger on units
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_unit_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _manager_id uuid;
  _quota integer;
  _expires timestamptz;
  _current_count bigint;
BEGIN
  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO _manager_id
  FROM public.building_members
  WHERE building_id = NEW.building_id AND role = 'manager'
  LIMIT 1;

  IF _manager_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT unit_quota, expires_at INTO _quota, _expires
  FROM public.customer_subscriptions
  WHERE user_id = _manager_id AND is_active = true
  ORDER BY expires_at DESC LIMIT 1;

  IF _quota IS NULL OR _expires IS NULL OR _expires < now() THEN
    RAISE EXCEPTION 'اشتراک شما منقضی شده است. لطفاً اعتبار خود را تمدید کنید.';
  END IF;

  SELECT COUNT(*) INTO _current_count
  FROM public.units u
  JOIN public.building_members bm ON bm.building_id = u.building_id
  WHERE bm.user_id = _manager_id AND bm.role = 'manager';

  IF _current_count >= _quota THEN
    RAISE EXCEPTION 'سقف واحد اشتراک شما (% واحد) تکمیل شده است. لطفاً پلن خود را ارتقا دهید.', _quota;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_unit_quota
  BEFORE INSERT ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unit_quota();

-- =========================================================
-- 6. Seed default plans
-- =========================================================
INSERT INTO public.subscription_plans (name, unit_quota, duration_days, price_rial, description, sort_order) VALUES
  ('پلن پایه', 20, 365, 5000000, 'مناسب ساختمان‌های کوچک تا ۲۰ واحد', 1),
  ('پلن متوسط', 50, 365, 10000000, 'مناسب ساختمان‌های ۲۰ تا ۵۰ واحدی', 2),
  ('پلن حرفه‌ای', 150, 365, 25000000, 'مناسب مجتمع‌های بزرگ', 3);

-- =========================================================
-- 7. Grant existing managers a trial subscription so the app doesn't break
-- =========================================================
INSERT INTO public.customer_subscriptions (user_id, unit_quota, starts_at, expires_at, is_active)
SELECT DISTINCT bm.user_id, 1000, now(), now() + interval '30 days', true
FROM public.building_members bm
WHERE bm.role = 'manager'
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_subscriptions cs WHERE cs.user_id = bm.user_id
  );
