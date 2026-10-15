-- Admin persistence RPCs are SECURITY DEFINER routines. They must only be
-- callable by the trusted server role after the application admin guard.
ALTER TYPE public.membership_status ADD VALUE IF NOT EXISTS 'INACTIVE';
REVOKE ALL ON FUNCTION public.generate_physical_cards(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_create_member(text, text, text, uuid, date, date, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_assign_card(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_all_physical_cards() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_all_memberships() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.generate_physical_cards(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_member(text, text, text, uuid, date, date, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_all_memberships()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'membership_number', m.membership_number,
      'full_name', m.full_name,
      'mobile', m.mobile,
      'email', m.email,
      'plan_id', m.plan_id,
      'plan_name', coalesce(p.name, 'PennyGrade 6-Month Membership'),
      'start_date', m.start_date,
      'expiry_date', m.expiry_date,
      'status', m.status,
      'created_at', m.created_at,
      'updated_at', m.updated_at,
      'card_number', coalesce(m.card_number, m.membership_number),
      'card_id', (select c.id from public.physical_cards c where c.membership_id = m.id and c.status = 'ACTIVE' order by c.issued_at desc limit 1)
    ) order by m.created_at desc
  ), '[]'::jsonb) INTO v_res
  FROM public.memberships m
  LEFT JOIN public.membership_plans p ON p.id = m.plan_id;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_memberships() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_memberships() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_assign_card(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_member(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_physical_cards() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_memberships() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;

-- Serialize card selection with assignment so two simultaneous member creates
-- cannot allocate the same available card.
CREATE OR REPLACE FUNCTION public.admin_create_member(
  p_full_name text,
  p_mobile text,
  p_email text,
  p_plan_id uuid,
  p_start_date date,
  p_expiry_date date,
  p_card_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_membership_id uuid := gen_random_uuid();
  v_membership_number text;
  v_card_id uuid := p_card_id;
  v_card_number text;
  v_now timestamptz := now();
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 OR p_mobile IS NULL OR length(trim(p_mobile)) < 10 THEN
    RAISE EXCEPTION 'Valid member name and mobile are required';
  END IF;
  IF p_start_date IS NULL OR p_expiry_date IS NULL OR p_expiry_date < p_start_date THEN
    RAISE EXCEPTION 'Expiry date must be on or after start date';
  END IF;
  IF p_plan_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Membership plan not found';
  END IF;

  IF v_card_id IS NOT NULL THEN
    SELECT card_number INTO v_card_number
    FROM public.physical_cards
    WHERE id = v_card_id AND status = 'AVAILABLE'
    FOR UPDATE;
    IF v_card_number IS NULL THEN
      RAISE EXCEPTION 'Selected card is not available or does not exist';
    END IF;
  ELSE
    SELECT id, card_number INTO v_card_id, v_card_number
    FROM public.physical_cards
    WHERE status = 'AVAILABLE'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  v_membership_number := public.gen_pen_code();
  INSERT INTO public.memberships (
    id, plan_id, membership_number, start_date, expiry_date, status,
    full_name, mobile, email, card_number, created_at, updated_at
  ) VALUES (
    v_membership_id, p_plan_id, v_membership_number, p_start_date, p_expiry_date,
    'ACTIVE', trim(p_full_name), trim(p_mobile), nullif(trim(coalesce(p_email, '')), ''),
    COALESCE(v_card_number, v_membership_number), v_now, v_now
  );

  IF v_card_id IS NOT NULL THEN
    UPDATE public.physical_cards
    SET membership_id = v_membership_id, status = 'ACTIVE', issued_at = v_now, updated_at = v_now
    WHERE id = v_card_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_membership_id, 'membership_number', v_membership_number,
    'card_number', COALESCE(v_card_number, v_membership_number), 'card_id', v_card_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_member(text, text, text, uuid, date, date, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_member(text, text, text, uuid, date, date, uuid) TO service_role;
