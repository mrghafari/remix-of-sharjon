CREATE OR REPLACE FUNCTION public.apply_payment_to_unit_charges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _policy record;
  _remaining numeric;
  _charge record;
  _outstanding numeric;
  _apply numeric;
  _paid_at timestamptz;
  _days_elapsed integer;
  _factor numeric;
  _discount numeric;
  _existing_discount_id uuid;
  _discount_description text;
  _months text[] := ARRAY['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
BEGIN
  IF current_setting('app.skip_auto_charge_settlement', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.unit_id IS NULL OR COALESCE(NEW.amount, 0) <= 0 OR NEW.fund_type IS NULL THEN
    RETURN NEW;
  END IF;

  _remaining := COALESCE(NEW.amount, 0);
  _paid_at := COALESCE(NEW.payment_date::timestamptz, NEW.created_at, now());

  SELECT * INTO _policy
  FROM public.building_payment_policies
  WHERE building_id = NEW.building_id
  LIMIT 1;

  FOR _charge IN
    SELECT id, amount, COALESCE(paid_amount, 0) AS paid_amount, created_at, owner_name, resident_name
    FROM public.unit_charges
    WHERE building_id = NEW.building_id
      AND unit_id = NEW.unit_id
      AND fund_type = NEW.fund_type
      AND month = NEW.month
      AND year = NEW.year
      AND amount > 0
      AND COALESCE(paid_amount, 0) < amount
      AND NOT (
        COALESCE(description, '') LIKE 'جریمه%'
        OR COALESCE(description, '') LIKE 'تخفیف خوش‌حسابی%'
      )
    ORDER BY created_at ASC, id ASC
    FOR UPDATE
  LOOP
    EXIT WHEN _remaining <= 0;

    _outstanding := GREATEST(_charge.amount - _charge.paid_amount, 0);
    IF _outstanding <= 0 THEN
      CONTINUE;
    END IF;

    _apply := LEAST(_remaining, _outstanding);

    UPDATE public.unit_charges
    SET paid_amount = COALESCE(paid_amount, 0) + _apply,
        paid_at = CASE
          WHEN COALESCE(paid_amount, 0) + _apply >= amount THEN _paid_at
          ELSE paid_at
        END
    WHERE id = _charge.id;

    _remaining := _remaining - _apply;

    IF COALESCE(_policy.early_pay_enabled, false)
       AND COALESCE(_policy.early_pay_auto_apply, false)
       AND COALESCE(_policy.early_pay_discount_percent, 0) > 0
       AND COALESCE(_policy.early_pay_days, 0) > 0
       AND _paid_at::date >= _charge.created_at::date THEN

      _days_elapsed := (_paid_at::date - _charge.created_at::date);

      IF _days_elapsed <= COALESCE(_policy.early_pay_days, 0) THEN
        _factor := GREATEST(0, COALESCE(_policy.early_pay_days, 0) - _days_elapsed)::numeric
          / GREATEST(1, COALESCE(_policy.early_pay_days, 0));
        _discount := ROUND(_apply * COALESCE(_policy.early_pay_discount_percent, 0) / 100 * _factor);

        IF _discount > 0 THEN
          _discount_description := 'تخفیف خوش‌حسابی ' || _months[NEW.month] || ' ' || NEW.year;

          SELECT id INTO _existing_discount_id
          FROM public.unit_charges
          WHERE building_id = NEW.building_id
            AND unit_id = NEW.unit_id
            AND fund_type = NEW.fund_type
            AND month = NEW.month
            AND year = NEW.year
            AND COALESCE(description, '') LIKE 'تخفیف خوش‌حسابی%'
          ORDER BY created_at ASC, id ASC
          LIMIT 1
          FOR UPDATE;

          IF _existing_discount_id IS NULL THEN
            INSERT INTO public.unit_charges (
              building_id, unit_id, amount, fund_type, month, year, description,
              owner_name, resident_name
            ) VALUES (
              NEW.building_id, NEW.unit_id, -_discount, NEW.fund_type, NEW.month, NEW.year,
              _discount_description,
              COALESCE(NEW.owner_name, _charge.owner_name),
              COALESCE(NEW.resident_name, _charge.resident_name)
            );
          ELSE
            UPDATE public.unit_charges
            SET amount = amount - _discount,
                owner_name = COALESCE(owner_name, NEW.owner_name, _charge.owner_name),
                resident_name = COALESCE(resident_name, NEW.resident_name, _charge.resident_name)
            WHERE id = _existing_discount_id;
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_payment_to_unit_charges() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_payment_to_unit_charges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_payment_to_unit_charges() FROM authenticated;

CREATE OR REPLACE FUNCTION public.resident_pay_and_clear(_building_id uuid, _unit_id uuid, _payments jsonb, _charge_ids_to_clear uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_member boolean;
  _is_manager boolean;
  _payment jsonb;
  _charge_pay_amount numeric := 0;
  _extra_pay_amount numeric := 0;
  _charge_paid_at timestamptz := now();
  _extra_paid_at timestamptz := now();
  _remaining numeric;
  _charge record;
  _outstanding numeric;
  _apply numeric;
  _policy record;
  _paid_at timestamptz;
  _days_elapsed integer;
  _factor numeric;
  _discount numeric;
  _existing_discount_id uuid;
  _discount_description text;
  _months text[] := ARRAY['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
BEGIN
  SELECT public.is_building_manager(auth.uid(), _building_id) INTO _is_manager;
  SELECT EXISTS (
    SELECT 1 FROM public.building_members
    WHERE user_id = auth.uid() AND building_id = _building_id AND unit_id = _unit_id
  ) INTO _is_member;

  IF NOT (_is_manager OR _is_member OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: not authorized for this unit';
  END IF;

  PERFORM set_config('app.skip_auto_charge_settlement', '1', true);

  SELECT * INTO _policy
  FROM public.building_payment_policies
  WHERE building_id = _building_id
  LIMIT 1;

  FOR _payment IN SELECT * FROM jsonb_array_elements(_payments)
  LOOP
    INSERT INTO public.payments (
      building_id, unit_id, amount, fund_type,
      payment_date, month, year, description,
      owner_name, resident_name
    ) VALUES (
      _building_id, _unit_id,
      (_payment->>'amount')::numeric,
      (_payment->>'fund_type')::fund_type,
      (_payment->>'payment_date')::date,
      (_payment->>'month')::int,
      (_payment->>'year')::int,
      _payment->>'description',
      _payment->>'owner_name',
      _payment->>'resident_name'
    );

    IF (_payment->>'fund_type') = 'charge' THEN
      _charge_pay_amount := _charge_pay_amount + COALESCE((_payment->>'amount')::numeric, 0);
      _charge_paid_at := COALESCE((_payment->>'payment_date')::date::timestamptz, now());
    ELSIF (_payment->>'fund_type') = 'extra_charge' THEN
      _extra_pay_amount := _extra_pay_amount + COALESCE((_payment->>'amount')::numeric, 0);
      _extra_paid_at := COALESCE((_payment->>'payment_date')::date::timestamptz, now());
    END IF;
  END LOOP;

  IF _charge_ids_to_clear IS NOT NULL AND array_length(_charge_ids_to_clear, 1) > 0 THEN
    _remaining := GREATEST(_charge_pay_amount, 0);
    FOR _charge IN
      SELECT id, amount
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'charge'
        AND amount < 0
        AND COALESCE(paid_amount, 0) = 0
      FOR UPDATE
    LOOP
      UPDATE public.unit_charges
        SET paid_amount = _charge.amount,
            paid_at = _charge_paid_at
        WHERE id = _charge.id;
      _remaining := _remaining + ABS(_charge.amount);
    END LOOP;

    FOR _charge IN
      SELECT id, amount, COALESCE(paid_amount,0) AS paid_amount, created_at, month, year, owner_name, resident_name
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'charge'
        AND amount >= 0
      ORDER BY year ASC, month ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN _remaining <= 0;
      _outstanding := GREATEST(_charge.amount - _charge.paid_amount, 0);
      IF _outstanding <= 0 THEN CONTINUE; END IF;
      _apply := LEAST(_remaining, _outstanding);
      UPDATE public.unit_charges
        SET paid_amount = COALESCE(paid_amount,0) + _apply,
            paid_at = CASE WHEN COALESCE(paid_amount,0) + _apply >= amount THEN _charge_paid_at ELSE paid_at END
        WHERE id = _charge.id;
      _remaining := _remaining - _apply;

      _paid_at := _charge_paid_at;
      IF COALESCE(_policy.early_pay_enabled, false)
         AND COALESCE(_policy.early_pay_auto_apply, false)
         AND COALESCE(_policy.early_pay_discount_percent, 0) > 0
         AND COALESCE(_policy.early_pay_days, 0) > 0
         AND _paid_at::date >= _charge.created_at::date THEN
        _days_elapsed := (_paid_at::date - _charge.created_at::date);
        IF _days_elapsed <= COALESCE(_policy.early_pay_days, 0) THEN
          _factor := GREATEST(0, COALESCE(_policy.early_pay_days, 0) - _days_elapsed)::numeric / GREATEST(1, COALESCE(_policy.early_pay_days, 0));
          _discount := ROUND(_apply * COALESCE(_policy.early_pay_discount_percent, 0) / 100 * _factor);
          IF _discount > 0 THEN
            _discount_description := 'تخفیف خوش‌حسابی ' || _months[_charge.month] || ' ' || _charge.year;
            SELECT id INTO _existing_discount_id
            FROM public.unit_charges
            WHERE building_id = _building_id AND unit_id = _unit_id AND fund_type = 'charge'
              AND month = _charge.month AND year = _charge.year
              AND COALESCE(description, '') LIKE 'تخفیف خوش‌حسابی%'
            ORDER BY created_at ASC, id ASC
            LIMIT 1
            FOR UPDATE;
            IF _existing_discount_id IS NULL THEN
              INSERT INTO public.unit_charges (building_id, unit_id, amount, fund_type, month, year, description, owner_name, resident_name)
              VALUES (_building_id, _unit_id, -_discount, 'charge', _charge.month, _charge.year, _discount_description, _charge.owner_name, _charge.resident_name);
            ELSE
              UPDATE public.unit_charges SET amount = amount - _discount WHERE id = _existing_discount_id;
            END IF;
          END IF;
        END IF;
      END IF;
    END LOOP;

    _remaining := GREATEST(_extra_pay_amount, 0);
    FOR _charge IN
      SELECT id, amount
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'extra_charge'
        AND amount < 0
        AND COALESCE(paid_amount, 0) = 0
      FOR UPDATE
    LOOP
      UPDATE public.unit_charges
        SET paid_amount = _charge.amount,
            paid_at = _extra_paid_at
        WHERE id = _charge.id;
      _remaining := _remaining + ABS(_charge.amount);
    END LOOP;

    FOR _charge IN
      SELECT id, amount, COALESCE(paid_amount,0) AS paid_amount, created_at, month, year, owner_name, resident_name
      FROM public.unit_charges
      WHERE id = ANY(_charge_ids_to_clear)
        AND unit_id = _unit_id
        AND building_id = _building_id
        AND fund_type = 'extra_charge'
        AND amount >= 0
      ORDER BY year ASC, month ASC, created_at ASC, id ASC
      FOR UPDATE
    LOOP
      EXIT WHEN _remaining <= 0;
      _outstanding := GREATEST(_charge.amount - _charge.paid_amount, 0);
      IF _outstanding <= 0 THEN CONTINUE; END IF;
      _apply := LEAST(_remaining, _outstanding);
      UPDATE public.unit_charges
        SET paid_amount = COALESCE(paid_amount,0) + _apply,
            paid_at = CASE WHEN COALESCE(paid_amount,0) + _apply >= amount THEN _extra_paid_at ELSE paid_at END
        WHERE id = _charge.id;
      _remaining := _remaining - _apply;

      _paid_at := _extra_paid_at;
      IF COALESCE(_policy.early_pay_enabled, false)
         AND COALESCE(_policy.early_pay_auto_apply, false)
         AND COALESCE(_policy.early_pay_discount_percent, 0) > 0
         AND COALESCE(_policy.early_pay_days, 0) > 0
         AND _paid_at::date >= _charge.created_at::date THEN
        _days_elapsed := (_paid_at::date - _charge.created_at::date);
        IF _days_elapsed <= COALESCE(_policy.early_pay_days, 0) THEN
          _factor := GREATEST(0, COALESCE(_policy.early_pay_days, 0) - _days_elapsed)::numeric / GREATEST(1, COALESCE(_policy.early_pay_days, 0));
          _discount := ROUND(_apply * COALESCE(_policy.early_pay_discount_percent, 0) / 100 * _factor);
          IF _discount > 0 THEN
            _discount_description := 'تخفیف خوش‌حسابی ' || _months[_charge.month] || ' ' || _charge.year;
            SELECT id INTO _existing_discount_id
            FROM public.unit_charges
            WHERE building_id = _building_id AND unit_id = _unit_id AND fund_type = 'extra_charge'
              AND month = _charge.month AND year = _charge.year
              AND COALESCE(description, '') LIKE 'تخفیف خوش‌حسابی%'
            ORDER BY created_at ASC, id ASC
            LIMIT 1
            FOR UPDATE;
            IF _existing_discount_id IS NULL THEN
              INSERT INTO public.unit_charges (building_id, unit_id, amount, fund_type, month, year, description, owner_name, resident_name)
              VALUES (_building_id, _unit_id, -_discount, 'extra_charge', _charge.month, _charge.year, _discount_description, _charge.owner_name, _charge.resident_name);
            ELSE
              UPDATE public.unit_charges SET amount = amount - _discount WHERE id = _existing_discount_id;
            END IF;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
END;
$$;