# PennyGrade Cashfree Merchant Readiness Review

**Review date:** 11 November 2026  
**Target:** Cashfree Payments, domestic India payments only  
**Status:** **NOT READY — Cashfree is not integrated; critical activation items remain.**

This is an engineering and website review, not Cashfree approval or legal advice. Website changes cannot guarantee merchant activation. Cashfree decides the eligible business category, product eligibility, documents, and account status.

## A. Business model observed in the repository

- PennyGrade presents and sells its own six-month physical membership card. The storefront derives price and availability from the active Supabase catalog/inventory; current public copy and live HTML show ₹500.
- Membership fees are revenue for PennyGrade. The About page and Terms say that independent partner businesses provide their own goods/services, apply their own eligible benefits, and collect those bills directly. The checkout is not designed to collect or split partner bills.
- The current public site discloses when no verified partners/offers are listed. The pre-existing live-data review found zero verified public partners and offers; this must be checked again in Admin before submission because partner status is mutable.
- Delivery is restricted to Daltonganj, Jharkhand. No fixed delivery SLA is promised. The shipping policy says checkout currently adds no separate shipping charge; confirm that operations and the checkout remain aligned.
- A physical membership card plus time-limited membership privileges is not automatically a conventional retail category. Do not mislabel it as a marketplace, stored-value instrument, gift card, or financial product. Request Cashfree's written category/product guidance for this exact model.

## B. Website and routes reviewed

Public pages reviewed in source and/or live HTTP checks: homepage, membership-card product, checkout, partner directory, About, Contact, How It Works, Terms, Privacy, Refund & Cancellation, Shipping & Delivery, order tracking, and verification. Live HTTP GETs to these routes plus `robots.txt` and `sitemap.xml` returned 200 on 11 November 2026. The application route smoke test also passed the public and protected-route checks.

The product price is server/catalog sourced rather than a hard-coded storefront amount. Product and checkout pages communicate the six-month physical card, Daltonganj delivery boundary, variable partner conditions, and zero-verified-partner state when applicable. The website does not claim Cashfree approval.

The Privacy Policy was corrected in this change to accurately identify Razorpay as the provider currently integrated in the checkout and to make policy updates a prerequisite to using a replacement provider. It would be misleading to state that Cashfree currently processes PennyGrade payments.

## C. Cashfree integration status and critical technical blockers

Cashfree payment integration is **not implemented**. Checkout currently uses Razorpay's browser SDK, server order creation, payment verification, webhook endpoint, and fulfillment RPC. The orders schema stores provider references in Razorpay-named columns, and both membership and prebooking fulfillment routines accept Razorpay fields. There is no Cashfree SDK/API client, Cashfree order endpoint, Cashfree payment lookup, Cashfree webhook handler, or Cashfree event/idempotency persistence.

Environment review found Cashfree client ID, secret, environment, webhook secret, and approval flag absent. Existing Razorpay configuration is present in the local environment; credential values were not read or disclosed. Do not put either provider's secret in `VITE_*` variables or frontend code.

Before switching providers, implement and review a backward-compatible Cashfree payment-reference/event migration. Preserve existing Razorpay IDs, payments, pending orders, membership orders, and prebooking orders. A provider-neutral fulfillment boundary must keep all captured-payment checks tied to the server-side order amount/currency and retain atomic/idempotent card allocation. Do not apply a migration to production as part of this review.

Required Cashfree flow, following current official documentation:

1. Create Cashfree orders only on the server with server-derived plan price, INR currency, customer details, and an order ID tied to the local order.
2. Use Cashfree Hosted Web Checkout with its returned `payment_session_id`; never expose the client secret.
3. Treat the browser return as a status hint only. Fetch order/payment status from Cashfree server-side before fulfillment.
4. Verify webhooks against the exact raw body using `x-webhook-timestamp`, `x-webhook-signature`, HMAC-SHA256 and Base64; then validate event, order, amount, currency, and paid status.
5. Make webhook/event processing idempotent (Cashfree documents at-least-once delivery and the `x-idempotency-header` on current webhook versions) and atomically prevent duplicate payment IDs or membership/card allocation.
6. Keep domestic acceptance limited to INR and configure/confirm UPI, domestic debit/credit cards, and net banking in the merchant account. Do not enable international payments.
7. Keep production payments disabled until Cashfree approval and a sandbox-to-production release checklist are complete.

## D. Security and database review

- Existing membership payment code verifies with the provider server-side and fulfills through a privileged database RPC. Existing Razorpay webhook logic compares provider payment details to the local order and handles duplicate/cancelled/refunded scenarios; this is not a Cashfree verification path.
- Existing database schema/functions and RLS are provider-specific for payment references. Existing application-level payment checks do not make Cashfree ready.
- Follow `AGENTS.md`: role authorization remains RLS-backed; partner catalog reads continue through `src/lib/public.functions.ts`; membership/card codes continue through `gen_pen_code()`; discount checks/calculation remain exclusively in the `create_verification` SECURITY DEFINER SQL function, called by RPC.
- Do not use local JSON snapshots as production plan, inventory, membership, or payment authority. Existing catalog and payment logic use Supabase for production; inspect the active Supabase target and migration state with the approved DB workflow before any release.
- No production migration, payment transaction, provider support contact, application submission, or deployment was performed.

## E. Business/policy evidence the owner must verify or provide

- Merchant legal name and constitution, PAN/KYC, bank proof, address proof, and any registration/tax documents requested by Cashfree, all matching the application and customer-facing records.
- Written Cashfree confirmation of the appropriate business category and that the physical card plus six-month membership is eligible under its standard domestic PG.
- Current card sample, genuine product photos, actual stock, packing/handover process, and a deliverable Daltonganj-only fulfilment process.
- Executed partner agreements and confirmed offer schedules before any business or offer is represented as participating/active. The repository's previous production review found no verified public partners; do not activate entries without evidence.
- Verify whether the published 4-business-day complaint review target and 5-business-day refund initiation target can actually be met. Revise policy if not; do not present policy text as proof of operations.
- Confirm support email/phone access, support hours, complaint handling procedure, refund approval/recording, and appropriate grievance contact.
- Confirm actual checkout price, delivery charge, and availability against the live active plan and inventory immediately before onboarding.

## F. Recommended category and confirmation needed

Do not select a category based on a superficial resemblance to Ecommerce. The product is PennyGrade's own physical membership card with six-month service access; it is not a multi-seller marketplace and the partner businesses collect their own bills. Ask Cashfree onboarding to classify the actual merchant and product in writing. Do not claim that a category is approved until Cashfree confirms it for this account.

## G. Test results

- `pnpm run typecheck` — passed.
- `pnpm test` — passed: 16 files, 145 tests.
- `pnpm run build` — passed. Warnings: deprecated TanStack `createServerFn().inputValidator()` calls and a Vite tsconfig-path plugin deprecation notice.
- `pnpm run smoke:routes` — passed, including expected 404 for an unknown route.
- Live HTTP route check — homepage, card product, checkout, directory, core policy/support pages, robots, and sitemap returned 200. This verifies HTTP availability only, not real payment or deployed Cashfree behavior.
- No live or sandbox payment was attempted. No automated end-to-end payment/webhook test exists for Cashfree because the integration and credentials are absent.

## Final activation decision

**NOT READY — CRITICAL ISSUES REMAIN.** First obtain Cashfree's category/product determination and merchant approval, implement Cashfree against sandbox with provider-neutral schema and verified/idempotent fulfillment, run payment/webhook/refund tests in sandbox, and confirm the real-world evidence and operational policy commitments above. Do not enable live Cashfree payments until those gates are satisfied.

## Official Cashfree documentation consulted

- [Payment Gateway overview](https://www.cashfree.com/docs/payments/overview)
- [Hosted Web Checkout integration](https://www.cashfree.com/docs/payments/online/web/redirect)
- [Create Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order)
- [Webhook overview and idempotency](https://www.cashfree.com/docs/payments/online/webhooks/overview)
- [Webhook signature verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification)
