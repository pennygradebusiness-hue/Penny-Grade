-- Counter initiated sessions do not require a customer login. The server calls
-- the SECURITY DEFINER routine with its service role after applying rate limits.
ALTER TABLE public.verification_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.verification_logs ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.create_verification(
  _partner_slug text,
  _membership_number text,
  _bill numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  m public.memberships%rowtype;
  p public.partners%rowtype;
  o public.offers%rowtype;
  v_member_id uuid;
  v_session_id uuid;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_dow int := extract(dow from (now() at time zone 'Asia/Kolkata'))::int;
  v_discount numeric;
BEGIN
  IF _bill IS NULL OR _bill <= 0 OR _bill > 10000000 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Please enter a valid bill amount.');
  END IF;

  SELECT id INTO v_member_id
  FROM public.memberships
  WHERE membership_number = upper(trim(_membership_number))
     OR id IN (
       SELECT membership_id FROM public.physical_cards
       WHERE card_number = upper(trim(_membership_number)) AND status = 'ACTIVE'
     )
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT * INTO m FROM public.memberships
  WHERE id = v_member_id AND status = 'ACTIVE' AND expiry_date >= v_today;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Unable to verify membership. Please check your membership number and try again.');
  END IF;

  IF (SELECT count(*) FROM public.verification_sessions
      WHERE membership_id = m.id AND created_at > now() - interval '1 minute') >= 6 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Too many verification attempts. Please wait a minute and try again.');
  END IF;

  SELECT * INTO p FROM public.partners
  WHERE slug = _partner_slug AND status = 'ACTIVE';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This PennyGrade partner could not be found.');
  END IF;

  SELECT * INTO o FROM public.offers
  WHERE partner_id = p.id AND status = 'ACTIVE'
    AND (valid_from IS NULL OR valid_from <= v_today)
    AND (valid_until IS NULL OR valid_until >= v_today)
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This offer is currently unavailable.');
  END IF;
  IF NOT (v_dow = ANY(o.valid_days)) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This offer is not valid today.');
  END IF;
  IF _bill < o.minimum_bill THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This offer requires a minimum bill of ₹' || trim(to_char(o.minimum_bill, 'FM99,99,99,990')) || '.');
  END IF;

  -- Discount calculation stays in SQL, alongside create_verification.
  IF o.discount_type = 'PERCENTAGE' THEN
    v_discount := round(_bill * o.discount_value / 100, 2);
  ELSE
    v_discount := o.discount_value;
  END IF;
  IF o.max_discount IS NOT NULL AND v_discount > o.max_discount THEN v_discount := o.max_discount; END IF;
  IF v_discount > _bill THEN v_discount := _bill; END IF;

  INSERT INTO public.verification_sessions(
    user_id, membership_id, partner_id, offer_id, bill_amount,
    discount_amount, final_amount, expires_at
  ) VALUES (
    NULL, m.id, p.id, o.id, round(_bill, 2), v_discount,
    round(_bill, 2) - v_discount, now() + interval '5 minutes'
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.verification_logs(
    verification_session_id, user_id, membership_id, partner_id, offer_id,
    bill_amount, discount_amount, final_amount
  ) VALUES (
    v_session_id, NULL, m.id, p.id, o.id,
    round(_bill, 2), v_discount, round(_bill, 2) - v_discount
  );

  RETURN jsonb_build_object('ok', true, 'session_id', v_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_verification(text, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_verification(text, text, numeric) TO service_role;
