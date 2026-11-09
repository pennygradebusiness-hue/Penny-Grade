-- ============================================================
-- PENNYGRADE ONLINE CARD PURCHASING, PHYSICAL FULFILMENT & NOTIFICATIONS
-- Migration: 20261103000001_card_purchasing_and_fulfilment.sql
-- ============================================================

-- Step 1: Create ENUM types safely
DO $$ BEGIN
  CREATE TYPE public.order_payment_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_fulfilment_status AS ENUM (
    'PAYMENT_PENDING',
    'PAID',
    'PROCESSING',
    'READY_TO_DISPATCH',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'FULFILMENT_EXCEPTION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Ensure membership_plans has benefits and card_included
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT ARRAY[
  'Exclusive verified discounts at 120+ top Daltonganj venues',
  'Physical luxury 3D membership card included',
  'Instant zero-friction in-person QR redemption',
  'Dedicated member support and concierge privileges'
];
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS card_included boolean DEFAULT true;

-- Step 2b: Helper function for crypto-secure unique order numbers
CREATE OR REPLACE FUNCTION public.gen_order_number()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
BEGIN
  RETURN 'ORD-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
END;
$$;

-- Step 3: Create membership_orders table
CREATE TABLE IF NOT EXISTS public.membership_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT public.gen_order_number(),
  customer_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  membership_plan_id uuid NOT NULL REFERENCES public.membership_plans(id),
  membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL,
  physical_card_id uuid REFERENCES public.physical_cards(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  payment_status public.order_payment_status NOT NULL DEFAULT 'PENDING',
  order_status public.order_fulfilment_status NOT NULL DEFAULT 'PAYMENT_PENDING',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  delivery_address_line1 text NOT NULL,
  delivery_address_line2 text,
  delivery_landmark text,
  delivery_city text NOT NULL,
  delivery_state text NOT NULL,
  delivery_pincode text NOT NULL,
  delivery_country text NOT NULL DEFAULT 'India',
  courier_name text,
  tracking_number text,
  tracking_url text,
  internal_notes text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.membership_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.membership_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.membership_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.membership_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.membership_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_membership_id ON public.membership_orders(membership_id);

DO $$ BEGIN
  CREATE TRIGGER trg_orders_upd BEFORE UPDATE ON public.membership_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 4: Create email_notifications table (Durable Outbox & Log)
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_name text,
  event_type text NOT NULL, -- 'PURCHASE_CONFIRMATION', 'CARD_DISPATCHED', 'CARD_DELIVERED', 'OFFER_REDEMPTION'
  html_body text,
  related_order_id uuid REFERENCES public.membership_orders(id) ON DELETE SET NULL,
  related_redemption_id uuid REFERENCES public.verification_sessions(id) ON DELETE SET NULL,
  subject text NOT NULL,
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  delivery_status text NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED', 'MOCK_SENT'
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  idempotency_key text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_notif_status ON public.email_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_notif_order ON public.email_notifications(related_order_id);
CREATE INDEX IF NOT EXISTS idx_email_notif_redemption ON public.email_notifications(related_redemption_id);
CREATE INDEX IF NOT EXISTS idx_email_notif_created ON public.email_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notif_idempotency ON public.email_notifications(idempotency_key);

DO $$ BEGIN
  CREATE TRIGGER trg_email_notif_upd BEFORE UPDATE ON public.email_notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.membership_orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by text NOT NULL DEFAULT 'system',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_hist_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_hist_created ON public.order_status_history(created_at DESC);

-- Step 6: Atomic Stored Procedure: fulfill_paid_membership_order
CREATE OR REPLACE FUNCTION public.fulfill_paid_membership_order(
  p_order_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_order public.membership_orders%rowtype;
  v_plan public.membership_plans%rowtype;
  v_membership_id uuid;
  v_membership_number text;
  v_card_id uuid;
  v_card_number text;
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'Asia/Kolkata')::date;
  v_expiry_date date;
BEGIN
  -- 1. Fetch and lock order
  SELECT * INTO v_order
  FROM public.membership_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Order not found');
  END IF;

  -- 2. Idempotency check: if already paid
  IF v_order.payment_status = 'PAID' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'membership_id', v_order.membership_id,
      'card_id', v_order.physical_card_id,
      'card_assigned', v_order.physical_card_id IS NOT NULL
    );
  END IF;

  IF v_order.payment_status = 'REFUNDED' OR v_order.order_status = 'CANCELLED' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Order is not eligible for payment fulfillment');
  END IF;

  -- 3. Fetch plan details
  SELECT * INTO v_plan
  FROM public.membership_plans
  WHERE id = v_order.membership_plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Associated membership plan not found');
  END IF;

  v_expiry_date := v_today + (COALESCE(v_plan.duration_days, 180) || ' days')::interval;

  -- 4. Mark payment as PAID
  UPDATE public.membership_orders
  SET payment_status = 'PAID',
      razorpay_payment_id = COALESCE(p_razorpay_payment_id, v_order.razorpay_payment_id),
      razorpay_signature = COALESCE(p_razorpay_signature, v_order.razorpay_signature),
      updated_at = v_now
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
  VALUES (p_order_id, v_order.order_status::text, 'PAID', 'payment_gateway', 'Payment verified successfully');

  -- 5. Atomically reserve an AVAILABLE physical card
  SELECT id, card_number INTO v_card_id, v_card_number
  FROM public.physical_cards
  WHERE status = 'AVAILABLE'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_card_id IS NULL THEN
    -- Stock exhausted: record order as paid but flag for admin fulfilment exception
    UPDATE public.membership_orders
    SET order_status = 'FULFILMENT_EXCEPTION',
        internal_notes = COALESCE(internal_notes || E'\n', '') || 'ALERT: Physical card stock exhausted during payment completion. Manual card assignment required.',
        updated_at = v_now
    WHERE id = p_order_id;

    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
    VALUES (p_order_id, 'PAID', 'FULFILMENT_EXCEPTION', 'system', 'Physical card stock exhausted - pending manual assignment');

    RETURN jsonb_build_object(
      'ok', true,
      'already_processed', false,
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'card_assigned', false,
      'message', 'Payment successful. Physical card inventory exhausted - order flagged for admin assignment.'
    );
  END IF;

  -- 6. Generate membership record
  v_membership_id := gen_random_uuid();
  v_membership_number := public.gen_pen_code();

  INSERT INTO public.memberships (
    id, plan_id, membership_number, start_date, expiry_date, status,
    full_name, mobile, email, card_number, created_at, updated_at
  ) VALUES (
    v_membership_id, v_plan.id, v_membership_number, v_today, v_expiry_date, 'ACTIVE',
    v_order.customer_name, v_order.customer_phone, v_order.customer_email, v_card_number, v_now, v_now
  );

  -- 7. Link card to membership
  UPDATE public.physical_cards
  SET membership_id = v_membership_id,
      status = 'ACTIVE',
      issued_at = v_now,
      updated_at = v_now
  WHERE id = v_card_id;

  -- 8. Link order to membership & physical card, set status to PROCESSING / PAID
  UPDATE public.membership_orders
  SET order_status = 'PAID',
      membership_id = v_membership_id,
      physical_card_id = v_card_id,
      updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_processed', false,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'membership_id', v_membership_id,
    'membership_number', v_membership_number,
    'card_id', v_card_id,
    'card_number', v_card_number,
    'card_assigned', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_paid_membership_order(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_membership_order(uuid, text, text) TO service_role;

-- Step 7: Stored Procedure: admin_assign_card_to_order
CREATE OR REPLACE FUNCTION public.admin_assign_card_to_order(
  p_order_id uuid,
  p_card_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_order public.membership_orders%rowtype;
  v_card public.physical_cards%rowtype;
  v_plan public.membership_plans%rowtype;
  v_membership_id uuid;
  v_membership_number text;
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'Asia/Kolkata')::date;
BEGIN
  SELECT * INTO v_order FROM public.membership_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Order not found');
  END IF;

  SELECT * INTO v_card FROM public.physical_cards WHERE id = p_card_id AND status = 'AVAILABLE' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Selected card is not available');
  END IF;

  IF v_order.membership_id IS NOT NULL THEN
    v_membership_id := v_order.membership_id;
    UPDATE public.physical_cards
    SET membership_id = v_membership_id, status = 'ACTIVE', issued_at = v_now, updated_at = v_now
    WHERE id = p_card_id;

    UPDATE public.memberships
    SET card_number = v_card.card_number, updated_at = v_now
    WHERE id = v_membership_id;
  ELSE
    SELECT * INTO v_plan FROM public.membership_plans WHERE id = v_order.membership_plan_id;
    v_membership_id := gen_random_uuid();
    v_membership_number := public.gen_pen_code();

    INSERT INTO public.memberships (
      id, plan_id, membership_number, start_date, expiry_date, status,
      full_name, mobile, email, card_number, created_at, updated_at
    ) VALUES (
      v_membership_id, v_order.membership_plan_id, v_membership_number, v_today,
      v_today + (COALESCE(v_plan.duration_days, 180) || ' days')::interval, 'ACTIVE',
      v_order.customer_name, v_order.customer_phone, v_order.customer_email, v_card.card_number, v_now, v_now
    );

    UPDATE public.physical_cards
    SET membership_id = v_membership_id, status = 'ACTIVE', issued_at = v_now, updated_at = v_now
    WHERE id = p_card_id;
  END IF;

  UPDATE public.membership_orders
  SET physical_card_id = p_card_id,
      membership_id = v_membership_id,
      order_status = CASE WHEN order_status = 'FULFILMENT_EXCEPTION' THEN 'PROCESSING'::public.order_fulfilment_status ELSE order_status END,
      updated_at = v_now
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
  VALUES (p_order_id, v_order.order_status::text, 'PROCESSING', 'admin', 'Physical card manually assigned: ' || v_card.card_number);

  RETURN jsonb_build_object('ok', true, 'card_number', v_card.card_number, 'membership_id', v_membership_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_card_to_order(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_card_to_order(uuid, uuid) TO service_role;

-- Step 8: Stored Procedure: admin_update_order_status
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_status text,
  p_courier_name text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL,
  p_tracking_url text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_admin_user text DEFAULT 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_order public.membership_orders%rowtype;
  v_now timestamptz := now();
  v_new_status public.order_fulfilment_status;
BEGIN
  SELECT * INTO v_order FROM public.membership_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Order not found');
  END IF;

  BEGIN
    v_new_status := p_status::public.order_fulfilment_status;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Invalid fulfilment status: ' || p_status);
  END;

  -- Validate state transitions
  IF v_new_status = 'CANCELLED' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Cancellation requires the refund workflow and is not available here');
  END IF;

  IF v_new_status = 'SHIPPED' AND v_order.payment_status != 'PAID' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Cannot ship an unpaid order');
  END IF;

  IF v_new_status = 'DELIVERED' AND v_order.order_status NOT IN ('SHIPPED', 'PROCESSING', 'READY_TO_DISPATCH') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Cannot mark as delivered from current status: ' || v_order.order_status);
  END IF;

  UPDATE public.membership_orders
  SET order_status = v_new_status,
      courier_name = COALESCE(p_courier_name, courier_name),
      tracking_number = COALESCE(p_tracking_number, tracking_number),
      tracking_url = COALESCE(p_tracking_url, tracking_url),
      internal_notes = CASE
        WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 THEN COALESCE(internal_notes || E'\n', '') || p_notes
        ELSE internal_notes
      END,
      shipped_at = CASE WHEN v_new_status = 'SHIPPED' AND shipped_at IS NULL THEN v_now ELSE shipped_at END,
      delivered_at = CASE WHEN v_new_status = 'DELIVERED' AND delivered_at IS NULL THEN v_now ELSE delivered_at END,
      updated_at = v_now
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, notes)
  VALUES (p_order_id, v_order.order_status::text, v_new_status::text, p_admin_user, p_notes);

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'new_status', v_new_status::text);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, text, text, text, text) TO service_role;

-- Step 9: Stored Procedure: get_order_summary_stats
CREATE OR REPLACE FUNCTION public.get_order_summary_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions AS $$
DECLARE
  v_total_orders int;
  v_pending_payments int;
  v_paid_orders int;
  v_processing int;
  v_ready_to_dispatch int;
  v_shipped int;
  v_delivered int;
  v_failed_payments int;
  v_exceptions int;
  v_emails_sent int;
  v_emails_pending int;
  v_emails_failed int;
BEGIN
  SELECT count(*) INTO v_total_orders FROM public.membership_orders;
  SELECT count(*) INTO v_pending_payments FROM public.membership_orders WHERE payment_status = 'PENDING';
  SELECT count(*) INTO v_paid_orders FROM public.membership_orders WHERE payment_status = 'PAID';
  SELECT count(*) INTO v_processing FROM public.membership_orders WHERE order_status = 'PROCESSING';
  SELECT count(*) INTO v_ready_to_dispatch FROM public.membership_orders WHERE order_status = 'READY_TO_DISPATCH';
  SELECT count(*) INTO v_shipped FROM public.membership_orders WHERE order_status = 'SHIPPED';
  SELECT count(*) INTO v_delivered FROM public.membership_orders WHERE order_status = 'DELIVERED';
  SELECT count(*) INTO v_failed_payments FROM public.membership_orders WHERE payment_status = 'FAILED';
  SELECT count(*) INTO v_exceptions FROM public.membership_orders WHERE order_status = 'FULFILMENT_EXCEPTION';

  SELECT count(*) INTO v_emails_sent FROM public.email_notifications WHERE delivery_status = 'SENT';
  SELECT count(*) INTO v_emails_pending FROM public.email_notifications WHERE delivery_status = 'PENDING';
  SELECT count(*) INTO v_emails_failed FROM public.email_notifications WHERE delivery_status = 'FAILED';

  RETURN jsonb_build_object(
    'total_orders', v_total_orders,
    'pending_payments', v_pending_payments,
    'paid_orders', v_paid_orders,
    'processing', v_processing,
    'ready_to_dispatch', v_ready_to_dispatch,
    'shipped', v_shipped,
    'delivered', v_delivered,
    'failed_payments', v_failed_payments,
    'exceptions', v_exceptions,
    'emails_sent', v_emails_sent,
    'emails_pending', v_emails_pending,
    'emails_failed', v_emails_failed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_summary_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_summary_stats() TO service_role;

-- Step 10: Row Level Security Configuration
ALTER TABLE public.membership_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Admins full access policies
DROP POLICY IF EXISTS "Admins full access to orders" ON public.membership_orders;
CREATE POLICY "Admins full access to orders" ON public.membership_orders
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access to email notifications" ON public.email_notifications;
CREATE POLICY "Admins full access to email notifications" ON public.email_notifications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins full access to order status history" ON public.order_status_history;
CREATE POLICY "Admins full access to order status history" ON public.order_status_history
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

