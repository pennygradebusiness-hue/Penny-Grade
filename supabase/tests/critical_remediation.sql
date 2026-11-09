-- Local Supabase/PostgreSQL integration checks for the critical migration.
-- All fixtures are synthetic test-only rows and the entire script rolls back.
-- Run only against a disposable local test database after all migrations.
BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('b0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'pg-remediation-test@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
INSERT INTO public.user_roles (user_id, role)
VALUES ('b0000000-0000-4000-8000-000000000001', 'manager');

INSERT INTO public.partners (id, business_name, slug, city, status)
VALUES ('b0000000-0000-4000-8000-000000000002', 'Synthetic test partner', 'pg-remediation-test', 'Daltonganj', 'INACTIVE');
INSERT INTO public.partner_private_evidence (
  partner_id, representative_name, business_verified_at, agreement_reference,
  agreement_signed_at, benefit_dispute_contact, internal_verification_notes,
  agreement_document_reference
)
VALUES ('b0000000-0000-4000-8000-000000000002', 'Synthetic fixture signatory', now(),
  'test-fixture-only', now(), 'test@example.test', 'synthetic fixture note', 'test-object-ref');
UPDATE public.partners SET status = 'ACTIVE' WHERE id = 'b0000000-0000-4000-8000-000000000002';

INSERT INTO public.partners (id, business_name, slug, city, status)
VALUES ('b0000000-0000-4000-8000-000000000003', 'Incomplete synthetic partner', 'pg-remediation-incomplete', 'Daltonganj', 'INACTIVE');

SELECT ok(NOT has_table_privilege('anon', 'public.partner_private_evidence', 'SELECT'), 'anon has no SELECT grant on private evidence');
SELECT ok(has_table_privilege('authenticated', 'public.partner_private_evidence', 'SELECT'), 'authenticated role can reach RLS-protected evidence for admin checks');
SELECT is((SELECT count(*)::int FROM public.partner_private_evidence WHERE partner_id = 'b0000000-0000-4000-8000-000000000002'), 1, 'test setup has evidence row');

SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.partners WHERE id = 'b0000000-0000-4000-8000-000000000003'), 0, 'anon cannot see incomplete partner');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
SELECT is((SELECT count(*)::int FROM public.partner_private_evidence WHERE partner_id = 'b0000000-0000-4000-8000-000000000002'), 1, 'manager can read authorised evidence through RLS');
RESET ROLE;

SELECT throws_ok(
  $$UPDATE public.partners SET status = 'ACTIVE' WHERE id = 'b0000000-0000-4000-8000-000000000003'$$,
  'P0001',
  'Partner cannot be activated without complete verified business and signed agreement evidence',
  'incomplete partner activation is rejected'
);
SELECT throws_ok(
  $$INSERT INTO public.offers (partner_id, title, discount_value, status) VALUES ('b0000000-0000-4000-8000-000000000003', 'Synthetic test offer', 10, 'ACTIVE')$$,
  'P0001',
  'Offer cannot be activated until its partner is active and has complete evidence',
  'offer activation is rejected for incomplete partner'
);

INSERT INTO public.membership_plans (id, name, price, duration_days, status)
VALUES ('b0000000-0000-4000-8000-000000000004', 'Synthetic payment test plan', 1, 180, 'ACTIVE');
INSERT INTO public.physical_cards (id, card_number, status)
VALUES ('b0000000-0000-4000-8000-000000000005', 'PEN-TST1-0001', 'AVAILABLE');
INSERT INTO public.membership_orders (
  id, customer_name, customer_email, customer_phone, membership_plan_id, amount,
  razorpay_order_id, delivery_address_line1, delivery_city, delivery_state, delivery_pincode
)
VALUES
 ('b0000000-0000-4000-8000-000000000006', 'Synthetic pending fixture', 'pending@example.test', '9000000001', 'b0000000-0000-4000-8000-000000000004', 1, 'order_fixture_pending', 'Test only', 'Daltonganj', 'Jharkhand', '822101'),
 ('b0000000-0000-4000-8000-000000000007', 'Synthetic cancelled fixture', 'cancelled@example.test', '9000000002', 'b0000000-0000-4000-8000-000000000004', 1, 'order_fixture_cancelled', 'Test only', 'Daltonganj', 'Jharkhand', '822101'),
 ('b0000000-0000-4000-8000-000000000008', 'Synthetic refunded fixture', 'refunded@example.test', '9000000003', 'b0000000-0000-4000-8000-000000000004', 1, 'order_fixture_refunded', 'Test only', 'Daltonganj', 'Jharkhand', '822101'),
 ('b0000000-0000-4000-8000-000000000009', 'Synthetic paid fixture', 'paid@example.test', '9000000004', 'b0000000-0000-4000-8000-000000000004', 1, 'order_fixture_paid', 'Test only', 'Daltonganj', 'Jharkhand', '822101'),
 ('b0000000-0000-4000-8000-00000000000a', 'Synthetic stock fixture', 'stock@example.test', '9000000005', 'b0000000-0000-4000-8000-000000000004', 1, 'order_fixture_stock', 'Test only', 'Daltonganj', 'Jharkhand', '822101');
UPDATE public.membership_orders SET payment_status = 'REFUNDED', order_status = 'CANCELLED' WHERE id = 'b0000000-0000-4000-8000-000000000007';
UPDATE public.membership_orders SET payment_status = 'REFUNDED' WHERE id = 'b0000000-0000-4000-8000-000000000008';

SELECT is((public.admin_assign_card_to_order('b0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000005')->>'ok')::boolean, false, 'unpaid order cannot receive card');
SELECT is((public.admin_assign_card_to_order('b0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000005')->>'ok')::boolean, false, 'cancelled order cannot receive card');
SELECT is((public.admin_assign_card_to_order('b0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000005')->>'ok')::boolean, false, 'refunded order cannot receive card');

SELECT ok((public.fulfill_paid_membership_order('b0000000-0000-4000-8000-000000000009', 'pay_fixture_same', 'test-signature')->>'card_assigned')::boolean, 'captured payment allocates available card');
SELECT ok((public.fulfill_paid_membership_order('b0000000-0000-4000-8000-000000000009', 'pay_fixture_same', 'test-signature')->>'already_processed')::boolean, 'same payment callback is idempotent');
SELECT is(public.fulfill_paid_membership_order('b0000000-0000-4000-8000-000000000009', 'pay_fixture_other', 'test-signature')->>'code', 'PAYMENT_ID_MISMATCH', 'different payment ID is rejected');

-- Hold remaining inventory out of the fixture transaction to exercise the paid
-- but unallocated state; rollback restores every original card row afterward.
UPDATE public.physical_cards SET status = 'ACTIVE' WHERE status = 'AVAILABLE';
SELECT is((public.fulfill_paid_membership_order('b0000000-0000-4000-8000-00000000000a', 'pay_fixture_stock', 'test-signature')->>'card_assigned')::boolean, false, 'stock exhaustion does not claim a card allocation');
INSERT INTO public.physical_cards (id, card_number, status)
VALUES ('b0000000-0000-4000-8000-00000000000b', 'PEN-TST1-0002', 'AVAILABLE');
SELECT ok((public.admin_assign_card_to_order('b0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b')->>'card_assigned')::boolean, 'admin can assign card after paid stock exception');

SELECT * FROM finish();
ROLLBACK;
