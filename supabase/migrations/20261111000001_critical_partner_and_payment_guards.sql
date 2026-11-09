-- Critical partner-evidence confidentiality and payment/fulfilment guards.
-- Requires 20261110000001_partner_verification_and_agreement_gate.sql.
-- Data-preserving: evidence is copied before the legacy public columns are dropped.
-- Do not apply to production without the documented backup/review and rollout.

BEGIN;

-- Keep partner due-diligence material outside the public partner catalog.
CREATE TABLE IF NOT EXISTS public.partner_private_evidence (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  representative_name text,
  business_verified_at timestamptz,
  agreement_reference text,
  agreement_signed_at timestamptz,
  benefit_dispute_contact text,
  internal_verification_notes text,
  agreement_document_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.partner_private_evidence (
  partner_id, representative_name, business_verified_at, agreement_reference,
  agreement_signed_at, benefit_dispute_contact
)
SELECT id, representative_name, business_verified_at, agreement_reference,
       agreement_signed_at, benefit_dispute_contact
FROM public.partners
ON CONFLICT (partner_id) DO UPDATE SET
  representative_name = COALESCE(public.partner_private_evidence.representative_name, EXCLUDED.representative_name),
  business_verified_at = COALESCE(public.partner_private_evidence.business_verified_at, EXCLUDED.business_verified_at),
  agreement_reference = COALESCE(public.partner_private_evidence.agreement_reference, EXCLUDED.agreement_reference),
  agreement_signed_at = COALESCE(public.partner_private_evidence.agreement_signed_at, EXCLUDED.agreement_signed_at),
  benefit_dispute_contact = COALESCE(public.partner_private_evidence.benefit_dispute_contact, EXCLUDED.benefit_dispute_contact),
  updated_at = now();

ALTER TABLE public.partner_private_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_private_evidence FROM PUBLIC, anon;
REVOKE ALL ON public.partner_private_evidence FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_private_evidence TO authenticated;
GRANT ALL ON public.partner_private_evidence TO service_role;

DROP POLICY IF EXISTS "Admins manage partner private evidence" ON public.partner_private_evidence;
DROP POLICY IF EXISTS "Admins read partner private evidence" ON public.partner_private_evidence;
CREATE POLICY "Admins read partner private evidence"
  ON public.partner_private_evidence FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), '{super_admin,manager,support}'::public.app_role[]));
CREATE POLICY "Managers manage partner private evidence"
  ON public.partner_private_evidence FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), '{super_admin,manager}'::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), '{super_admin,manager}'::public.app_role[]));

CREATE OR REPLACE FUNCTION public.partner_has_complete_evidence(p_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_private_evidence e
    WHERE e.partner_id = p_partner_id
      AND NULLIF(btrim(e.representative_name), '') IS NOT NULL
      AND e.business_verified_at IS NOT NULL
      AND NULLIF(btrim(e.agreement_reference), '') IS NOT NULL
      AND e.agreement_signed_at IS NOT NULL
      AND NULLIF(btrim(e.benefit_dispute_contact), '') IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.partner_has_complete_evidence(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_has_complete_evidence(uuid) TO service_role;

-- Public callers can learn only whether a partner is already eligible for the
-- public catalog, which is information the directory itself exposes.
CREATE OR REPLACE FUNCTION public.partner_is_publicly_eligible(p_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = p_partner_id AND p.status = 'ACTIVE'
      AND public.partner_has_complete_evidence(p.id)
  );
$$;
REVOKE ALL ON FUNCTION public.partner_is_publicly_eligible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_is_publicly_eligible(uuid) TO anon, authenticated, service_role;

-- Historical ACTIVE rows with missing evidence stay in the database but are
-- withdrawn from public listing and have their offers inactivated.
UPDATE public.offers o SET status = 'INACTIVE'
FROM public.partners p
WHERE p.id = o.partner_id AND o.status = 'ACTIVE'
  AND NOT public.partner_has_complete_evidence(p.id);

UPDATE public.partners p SET status = 'INACTIVE', featured = false
WHERE p.status = 'ACTIVE' AND NOT public.partner_has_complete_evidence(p.id);

DROP TRIGGER IF EXISTS trg_partner_publication_evidence ON public.partners;
DROP FUNCTION IF EXISTS public.enforce_partner_publication_evidence();
DROP TRIGGER IF EXISTS trg_active_offer_partner_evidence ON public.offers;
DROP FUNCTION IF EXISTS public.enforce_active_offer_partner_evidence();

CREATE OR REPLACE FUNCTION public.enforce_partner_publication_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND NOT public.partner_has_complete_evidence(NEW.id) THEN
    RAISE EXCEPTION 'Partner cannot be activated without complete verified business and signed agreement evidence';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_partner_publication_evidence
  BEFORE INSERT OR UPDATE OF status ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_publication_evidence();

CREATE OR REPLACE FUNCTION public.enforce_active_offer_partner_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND NOT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = NEW.partner_id AND p.status = 'ACTIVE'
      AND public.partner_has_complete_evidence(p.id)
  ) THEN
    RAISE EXCEPTION 'Offer cannot be activated until its partner is active and has complete evidence';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_active_offer_partner_evidence
  BEFORE INSERT OR UPDATE OF status, partner_id ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_offer_partner_evidence();

CREATE OR REPLACE FUNCTION public.enforce_private_evidence_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid := COALESCE(NEW.partner_id, OLD.partner_id);
BEGIN
  IF EXISTS (SELECT 1 FROM public.partners p WHERE p.id = v_partner_id AND p.status = 'ACTIVE') THEN
    IF TG_OP = 'DELETE' OR
      NULLIF(btrim(NEW.representative_name), '') IS NULL OR NEW.business_verified_at IS NULL OR
      NULLIF(btrim(NEW.agreement_reference), '') IS NULL OR NEW.agreement_signed_at IS NULL OR
      NULLIF(btrim(NEW.benefit_dispute_contact), '') IS NULL THEN
      RAISE EXCEPTION 'Deactivate partner before removing required publication evidence';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_private_evidence_before_publish
  BEFORE INSERT OR UPDATE OR DELETE ON public.partner_private_evidence
  FOR EACH ROW EXECUTE FUNCTION public.enforce_private_evidence_before_publish();

CREATE OR REPLACE FUNCTION public.withdraw_ineligible_partner_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid := COALESCE(NEW.partner_id, OLD.partner_id);
BEGIN
  IF NOT public.partner_has_complete_evidence(v_partner_id) THEN
    UPDATE public.partners SET status = 'INACTIVE', featured = false WHERE id = v_partner_id;
    UPDATE public.offers SET status = 'INACTIVE' WHERE partner_id = v_partner_id AND status = 'ACTIVE';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_withdraw_ineligible_partner_publication
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_private_evidence
  FOR EACH ROW EXECUTE FUNCTION public.withdraw_ineligible_partner_publication();

DROP POLICY IF EXISTS "public active partners" ON public.partners;
CREATE POLICY "public active partners" ON public.partners FOR SELECT TO anon, authenticated
  USING (public.partner_is_publicly_eligible(id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "public active offers" ON public.offers;
CREATE POLICY "public active offers" ON public.offers FOR SELECT TO anon, authenticated USING (
  (status = 'ACTIVE' AND EXISTS (
    SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.status = 'ACTIVE'
      AND public.partner_is_publicly_eligible(p.id)
  )) OR public.is_admin(auth.uid())
);

ALTER TABLE public.partners
  DROP COLUMN representative_name,
  DROP COLUMN business_verified_at,
  DROP COLUMN agreement_reference,
  DROP COLUMN agreement_signed_at,
  DROP COLUMN benefit_dispute_contact;

-- Authenticated admins use server functions with service-role access; direct
-- public table reads remain restricted to the catalog fields that still exist.
-- RLS continues to filter eligible active rows.

-- A captured payment ID may belong to only one local order. Fail explicitly if
-- historical data already violates this invariant so an operator can reconcile
-- it rather than silently discarding or overwriting a payment reference.
DO $$
BEGIN
  IF EXISTS (
    SELECT razorpay_payment_id FROM public.membership_orders
    WHERE razorpay_payment_id IS NOT NULL
    GROUP BY razorpay_payment_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate Razorpay payment IDs exist; reconcile them before applying the unique index';
  END IF;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_orders_razorpay_payment_id_unique
  ON public.membership_orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_paid_membership_order(
  p_order_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order public.membership_orders%ROWTYPE;
  v_plan public.membership_plans%ROWTYPE;
  v_membership_id uuid;
  v_membership_number text;
  v_card_id uuid;
  v_card_number text;
  v_constraint_name text;
  v_now timestamptz := now();
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_expiry_date date;
BEGIN
  IF NULLIF(btrim(p_razorpay_payment_id), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PAYMENT_ID_REQUIRED', 'message', 'Captured payment ID is required');
  END IF;

  SELECT * INTO v_order FROM public.membership_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_NOT_FOUND', 'message', 'Order not found');
  END IF;

  IF v_order.payment_status = 'REFUNDED' THEN
    IF position(p_razorpay_payment_id IN COALESCE(v_order.internal_notes, '')) = 0 THEN
      UPDATE public.membership_orders SET internal_notes =
        concat_ws(E'\n', NULLIF(internal_notes, ''),
          'ALERT: Captured payment ' || p_razorpay_payment_id || ' is associated with an already-refunded order; manual review required.')
        WHERE id = p_order_id;
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_REFUNDED', 'message', 'Order is already refunded; captured payment requires review');
  END IF;
  IF v_order.order_status = 'CANCELLED' THEN
    IF position(p_razorpay_payment_id IN COALESCE(v_order.internal_notes, '')) = 0 THEN
      UPDATE public.membership_orders SET internal_notes =
        concat_ws(E'\n', NULLIF(internal_notes, ''),
          'ALERT: Captured payment ' || p_razorpay_payment_id || ' belongs to a cancelled or refunded order; manual refund review required.')
        WHERE id = p_order_id;
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_CANCELLED', 'message', 'Order is cancelled; captured payment requires refund review');
  END IF;
  IF v_order.payment_status = 'PAID' THEN
    IF v_order.razorpay_payment_id IS DISTINCT FROM p_razorpay_payment_id THEN
      IF position(p_razorpay_payment_id IN COALESCE(v_order.internal_notes, '')) = 0 THEN
        UPDATE public.membership_orders SET internal_notes =
          concat_ws(E'\n', NULLIF(internal_notes, ''),
            'ALERT: Additional captured payment ' || p_razorpay_payment_id || ' requires duplicate-charge/refund review.')
          WHERE id = p_order_id;
      END IF;
      RETURN jsonb_build_object('ok', false, 'code', 'PAYMENT_ID_MISMATCH', 'message', 'Order is already paid with a different payment ID');
    END IF;
    RETURN jsonb_build_object(
      'ok', true, 'already_processed', true,
      'order_id', v_order.id, 'order_number', v_order.order_number,
      'membership_id', v_order.membership_id, 'card_id', v_order.physical_card_id,
      'card_assigned', v_order.physical_card_id IS NOT NULL,
      'fulfillment_exception', v_order.order_status = 'FULFILMENT_EXCEPTION'
    );
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.membership_orders other_order
    WHERE other_order.razorpay_payment_id = p_razorpay_payment_id AND other_order.id <> p_order_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PAYMENT_ID_ALREADY_USED', 'message', 'Payment ID is already associated with another order');
  END IF;

  SELECT * INTO v_plan FROM public.membership_plans WHERE id = v_order.membership_plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND', 'message', 'Associated membership plan not found');
  END IF;
  v_expiry_date := v_today + (COALESCE(v_plan.duration_days, 180) || ' days')::interval;

  UPDATE public.membership_orders SET payment_status = 'PAID',
    razorpay_payment_id = p_razorpay_payment_id,
    razorpay_signature = COALESCE(p_razorpay_signature, razorpay_signature),
    updated_at = v_now WHERE id = p_order_id;
  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
  VALUES (p_order_id, v_order.order_status::text, 'PAID', 'payment_gateway', 'Payment verified successfully');

  SELECT id, card_number INTO v_card_id, v_card_number FROM public.physical_cards
  WHERE status = 'AVAILABLE' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF v_card_id IS NULL THEN
    UPDATE public.membership_orders SET order_status = 'FULFILMENT_EXCEPTION',
      internal_notes = COALESCE(internal_notes || E'\n', '') || 'ALERT: Physical card stock exhausted during payment completion. Manual card assignment required.',
      updated_at = v_now WHERE id = p_order_id;
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
    VALUES (p_order_id, 'PAID', 'FULFILMENT_EXCEPTION', 'system', 'Physical card stock exhausted - pending manual assignment');
    RETURN jsonb_build_object('ok', true, 'already_processed', false,
      'order_id', v_order.id, 'order_number', v_order.order_number,
      'payment_status', 'PAID', 'card_assigned', false,
      'fulfillment_exception', true,
      'message', 'Payment captured. No card was allocated; support must resolve the fulfilment exception.');
  END IF;

  v_membership_id := gen_random_uuid();
  v_membership_number := public.gen_pen_code();
  INSERT INTO public.memberships (
    id, plan_id, membership_number, start_date, expiry_date, status,
    full_name, mobile, email, card_number, created_at, updated_at
  ) VALUES (v_membership_id, v_plan.id, v_membership_number, v_today, v_expiry_date,
    'ACTIVE', v_order.customer_name, v_order.customer_phone, v_order.customer_email,
    v_card_number, v_now, v_now);
  UPDATE public.physical_cards SET membership_id = v_membership_id, status = 'ACTIVE',
    issued_at = v_now, updated_at = v_now WHERE id = v_card_id;
  UPDATE public.membership_orders SET order_status = 'PAID', membership_id = v_membership_id,
    physical_card_id = v_card_id, updated_at = v_now WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'already_processed', false,
    'order_id', v_order.id, 'order_number', v_order.order_number,
    'membership_id', v_membership_id, 'membership_number', v_membership_number,
    'card_id', v_card_id, 'card_number', v_card_number, 'card_assigned', true,
    'fulfillment_exception', false);
EXCEPTION WHEN unique_violation THEN
  GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
  IF v_constraint_name = 'idx_membership_orders_razorpay_payment_id_unique' THEN
    IF v_order.id IS NOT NULL AND position(p_razorpay_payment_id IN COALESCE(v_order.internal_notes, '')) = 0 THEN
      UPDATE public.membership_orders SET internal_notes =
        concat_ws(E'\n', NULLIF(internal_notes, ''),
          'ALERT: Razorpay payment ID ' || p_razorpay_payment_id || ' conflicted with another order; manual review required.')
        WHERE id = v_order.id;
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PAYMENT_ID', 'message', 'Payment ID is already attached to another order');
  END IF;
  RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.fulfill_paid_membership_order(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_membership_order(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_assign_card_to_order(p_order_id uuid, p_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_order public.membership_orders%ROWTYPE;
  v_card public.physical_cards%ROWTYPE;
  v_plan public.membership_plans%ROWTYPE;
  v_membership_id uuid;
  v_membership_number text;
  v_now timestamptz := now();
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  SELECT * INTO v_order FROM public.membership_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'Order not found'); END IF;
  IF v_order.payment_status <> 'PAID' OR v_order.payment_status = 'REFUNDED'
     OR v_order.order_status IN ('CANCELLED', 'SHIPPED', 'DELIVERED') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_NOT_ELIGIBLE', 'message', 'Only captured, non-refunded, unfulfilled orders can receive a card');
  END IF;
  IF v_order.order_status NOT IN ('PAID', 'FULFILMENT_EXCEPTION', 'PROCESSING', 'READY_TO_DISPATCH') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_NOT_ELIGIBLE', 'message', 'Order is not eligible for card allocation');
  END IF;
  IF v_order.physical_card_id IS NOT NULL AND v_order.physical_card_id <> p_card_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CARD_ALREADY_ASSIGNED', 'message', 'A card is already assigned; use a dedicated replacement workflow');
  END IF;
  IF v_order.physical_card_id = p_card_id THEN
    RETURN jsonb_build_object('ok', true, 'already_assigned', true, 'membership_id', v_order.membership_id);
  END IF;

  SELECT * INTO v_card FROM public.physical_cards WHERE id = p_card_id AND status = 'AVAILABLE' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'Selected card is not available'); END IF;
  SELECT * INTO v_plan FROM public.membership_plans WHERE id = v_order.membership_plan_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'message', 'Membership plan not found'); END IF;

  v_membership_id := v_order.membership_id;
  IF v_membership_id IS NULL THEN
    v_membership_id := gen_random_uuid();
    v_membership_number := public.gen_pen_code();
    INSERT INTO public.memberships (
      id, plan_id, membership_number, start_date, expiry_date, status,
      full_name, mobile, email, card_number, created_at, updated_at
    ) VALUES (v_membership_id, v_plan.id, v_membership_number, v_today,
      v_today + (COALESCE(v_plan.duration_days, 180) || ' days')::interval,
      'ACTIVE', v_order.customer_name, v_order.customer_phone, v_order.customer_email,
      v_card.card_number, v_now, v_now);
  ELSE
    UPDATE public.memberships SET card_number = v_card.card_number, updated_at = v_now
    WHERE id = v_membership_id;
  END IF;

  UPDATE public.physical_cards SET membership_id = v_membership_id, status = 'ACTIVE',
    issued_at = v_now, updated_at = v_now WHERE id = p_card_id;
  UPDATE public.membership_orders SET physical_card_id = p_card_id, membership_id = v_membership_id,
    order_status = CASE WHEN order_status = 'FULFILMENT_EXCEPTION' THEN 'PROCESSING'::public.order_fulfilment_status ELSE order_status END,
    updated_at = v_now WHERE id = p_order_id;
  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
  VALUES (p_order_id, v_order.order_status::text, 'PROCESSING', 'admin', 'Physical card assigned: ' || v_card.card_number);
  RETURN jsonb_build_object('ok', true, 'card_number', v_card.card_number, 'membership_id', v_membership_id, 'card_assigned', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_card_to_order(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_card_to_order(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Rollback notes: restore a pre-migration backup or write a reviewed reverse
-- migration. Re-adding public evidence columns would re-expose sensitive data;
-- the partner evidence copy is intentionally retained and partner/offer rows are
-- inactivated, not deleted. Payment ID uniqueness must not be removed without
-- reconciling all captured payments first.
