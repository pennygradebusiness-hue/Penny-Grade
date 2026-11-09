# PennyGrade critical remediation report

**Scope:** workspace-only remediation of the six findings in the supplied pre-deployment brief. No production database, payment provider, email service, delivery operation, or deployment was accessed or changed.

## Findings and changes

| Finding | Root cause | Workspace remediation |
| --- | --- | --- |
| Partner evidence exposed by the public catalog API | Verification/representative/agreement/contact fields lived on `partners`, a table granted to `anon` and `authenticated` for catalog SELECT. | New migration copies the fields into `partner_private_evidence`, gives anon no table access, grants authenticated access only through admin RLS, and removes evidence columns from `partners`. Public RLS uses a restricted eligibility function that only returns true for partners already eligible for the public catalog. Admin server functions now read/write the private table after admin authorization. |
| Existing and future partner evidence gates incomplete | Earlier gate checked only some fields, did not protect the evidence table lifecycle, and did not hide every historical incomplete row. | New migration carries all five required evidence fields, deactivates incomplete existing active partners and offers without deleting rows, adds partner/offer activation triggers, blocks removal of required evidence while active, and withdraws offers if evidence is removed after deactivation. Public partner and offer RLS plus sitemap/local-store fallbacks filter for complete evidence. |
| Admin card assignment could activate unpaid orders | The SECURITY DEFINER assignment function created/activated membership without checking payment/refund/cancel state. | Replaced `admin_assign_card_to_order` in the new migration. It requires `payment_status = PAID`, eligible fulfilment state, no cancellation/refund, and an available card; it refuses unsafe reassignment. The local-store fallback has matching checks. |
| Payment confirmation could overstate allocation/email | Checkout ignored email failure; customer confirmation hardcoded reserved/allocated/sent status; email template described unallocated stock as queued for packing. | Checkout hands off explicit captured-payment, card allocation and email status. Confirmation and tracking pages render allocation/exception status from verified results; email copy distinguishes allocated from pending allocation. “Sent” is displayed as provider accepted/submitted, not inbox delivery. |
| Duplicate captured callbacks were not strictly idempotent | Fulfillment treated every already-paid order as a successful replay, without comparing payment ID; separate callbacks could race. | Replacement RPC locks the order row (`FOR UPDATE`), returns success only for the same payment ID, rejects a different/reused ID, appends a review note atomically for a second capture, and reports stock exhaustion as paid with no card allocated. A partial unique index prevents a payment ID being assigned to multiple orders. The webhook now delegates duplicate/cancel/refund decisions to the locked RPC. |
| Partner page showed exact browser-calculated savings | Partner detail page duplicated discount math in React and labeled the result “exact.” | Removed the calculator and its dead local verification/calculation code. The page directs customers to the live verification flow. `create_verification` remains the only discount calculation authority; existing V1 unit tests that reimplemented discount math were replaced by RPC/source-contract checks. |

## Changed files

- `supabase/migrations/20261111000001_critical_partner_and_payment_guards.sql` — forward migration for private partner evidence, historical publication reconciliation, RLS/triggers, payment-ID uniqueness, fulfillment idempotency, and paid-order card assignment.
- `supabase/tests/critical_remediation.sql` — transactional pgTAP integration checks using synthetic fixtures; the script ends in `ROLLBACK`.
- `src/lib/admin.functions.ts`, `src/lib/public.functions.ts`, `src/lib/partner-publication.ts`, `src/lib/orders.logic.ts`, `src/lib/payment-lifecycle.ts`, `src/lib/order-confirmation.ts` — private evidence handling, public filters, replay classification, and explicit verified state.
- `src/routes/api.webhooks.razorpay.ts`, `src/routes/checkout.tsx`, `src/routes/order-confirmation.$orderNumber.tsx`, `src/routes/track-order.tsx`, `src/routes/partners.$slug.tsx`, `src/routes/sitemap[.]xml.ts` — webhook outcomes and truthful customer/public UI.
- `src/lib/email.service.ts`, `src/integrations/supabase/types.ts` — corrected email allocation language and schema types.
- `src/test/critical-remediation-contract.test.ts`, `src/test/partner-publication.test.ts`, `src/test/payment-lifecycle.test.ts`, `src/test/order-confirmation.test.ts`, `src/test/v1-acceptance.test.ts`, `src/test/admin-security.test.ts`, `src/test/seo-and-error-handling.test.ts` — unit/contract checks updated for the SQL-authoritative design.

## Migration dependencies and execution order

1. Confirm the deployed database is at the expected baseline and has applied all preceding migrations, including `20261103000001_card_purchasing_and_fulfilment.sql`, `20261110000001_partner_verification_and_agreement_gate.sql`, and the order cancellation guard.
2. Before the new migration, run a read-only duplicate payment-ID check. The migration intentionally aborts if historical non-null `razorpay_payment_id` duplicates exist; reconcile them manually before retrying.
3. Review and back up the database. Apply `20261111000001_critical_partner_and_payment_guards.sql` to a disposable/staging Supabase database first; inspect the number of partners/offers it deactivates and validate the resulting RLS behavior.
4. Deploy the matching application code only after the schema migration succeeds. The new code reads partner evidence from `partner_private_evidence`; deploying it before the migration will fail against the old schema.
5. Run the pgTAP file with `supabase test db` against the migrated disposable local database, then perform separate authenticated-admin and unauthenticated REST checks.

The migration preserves partner and offer rows. Historical active partners/offers that lack any required evidence are inactivated rather than deleted. Rollback is not a blind `DROP`/restore: re-exposing evidence columns would undo the confidentiality fix. Use a database backup or a reviewed forward repair migration. The unique payment-ID index must remain unless every captured payment is reconciled.

## Tests and validation

- `pnpm typecheck` — **PASS**.
- `pnpm test` — **PASS**, 16 test files and 143 tests. This includes unit and static migration-contract checks.
- `pnpm build` — **PASS**. Vite emitted existing `inputValidator()` deprecation notices; no build errors.
- `supabase/tests/critical_remediation.sql` — **added, not executed**. It tests RLS visibility/admin access, incomplete partner/offer activation, unpaid/cancelled/refunded card assignment, same-ID replay, different-ID rejection, stock exhaustion and later paid-order allocation. It must run only on a disposable local DB.

The Vitest migration-contract tests inspect source text and application helpers; they are not PostgreSQL integration tests and do not prove runtime RLS, trigger, transaction or concurrency behavior. `supabase`, `psql` and `docker` were unavailable in the workspace, and no database credentials/local database were used, so runtime SQL and concurrent callback tests remain outstanding.

## Remaining blockers and manual actions

- Apply/rehearse both partner evidence migrations in the correct order in a disposable environment; this workspace migration is unapplied.
- Review affected existing partner/offer counts and privately reconcile actual evidence. Do not invent any records.
- Run the pgTAP/RLS integration checks against local Supabase. Confirm anonymous REST cannot read the private table and an authenticated manager can read it.
- Run a true parallel callback test against a disposable PostgreSQL database with two concurrent transactions. The implementation serializes order callbacks and has a unique payment-ID index, but concurrency was not exercised in this environment.
- Verify the SQL functions, grants and schema cache reload on the target Supabase version before production rollout. No production database schema was available for compatibility validation.
- Configure and test a real Razorpay test account and webhook secret, and a verified Resend sender in a staging environment. No real provider operations were performed.
- Reconcile any existing duplicate payment IDs before the unique index migration; otherwise migration correctly fails closed.
- Card stock is selected atomically at payment fulfillment, and the stock-exhaustion exception is explicit. Pre-payment inventory reservation is still not implemented; concurrent payments can exceed card stock, but cannot falsely claim an allocation.
- A refund is still an operational/admin process; the code does not initiate a refund. Resolve paid fulfilment exceptions through the documented support/refund process.

## Final status

The code and migration remediation are implemented in the workspace. Unit tests cover the new application behavior and static migration invariants. **Production readiness is not established** until the unapplied migration is rehearsed, SQL integration/RLS/concurrency tests pass on a disposable database, and provider/staging checks are completed. No migrations were applied, no deployment occurred, and no real payment, refund, email or courier action was initiated.
