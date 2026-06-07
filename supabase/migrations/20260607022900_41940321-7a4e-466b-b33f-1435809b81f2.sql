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
       AND _paid_at >= _charge.created_at THEN

      _days_elapsed := FLOOR(EXTRACT(EPOCH FROM (_paid_at - _charge.created_at)) / 86400)::integer;

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

DROP TRIGGER IF EXISTS trg_apply_payment_to_unit_charges ON public.payments;
CREATE TRIGGER trg_apply_payment_to_unit_charges
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.apply_payment_to_unit_charges();